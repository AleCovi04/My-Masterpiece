import Dexie from 'dexie'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { describe, expect, it, vi } from 'vitest'
import {
  createDexieStore,
  DB_NAME,
  DEFAULT_RACE_DATE,
  MAX_BACKUPS,
  type DexieStoreOptions,
} from './dexieStore'
import type { LegacyStorage } from './legacyLocalStorage'
import { SCHEMA_VERSION } from './migrations'
import type {
  BlockApplication,
  Exercise,
  LiveWorkout,
  Phase,
  StrengthTemplate,
  TrainingBlock,
} from './types'

const t0 = new Date('2026-11-16T08:00:00.000Z')
const DAY = 864e5

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  const storage: LegacyStorage = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }
  return { storage, map }
}

/** Un "browser": stesso IndexedDB per più aperture dello store, orologio regolabile. */
function browser(legacy?: LegacyStorage) {
  const idb = { indexedDB: new IDBFactory(), IDBKeyRange }
  const clock = { now: t0 }
  let persistRequests = 0
  const open = (extra: Partial<DexieStoreOptions> = {}) =>
    createDexieStore({
      idb,
      legacy,
      now: () => clock.now,
      requestPersistence: async () => {
        persistRequests += 1
        return true
      },
      ...extra,
    })
  return { open, clock, idb, persistRequests: () => persistRequests }
}

const exercise = (id: string): Exercise => ({
  id,
  createdAt: t0.toISOString(),
  updatedAt: t0.toISOString(),
  name: id,
  muscles: [{ muscle: 'chest', percent: 100 }],
  defaultRestSeconds: 165,
  archived: false,
})

const template = (id: string): StrengthTemplate => ({
  id,
  createdAt: t0.toISOString(),
  updatedAt: t0.toISOString(),
  name: id,
  discipline: 'strength',
  estimatedDurationSec: 3600,
  archived: false,
  entries: [{ exerciseId: 'a', restSeconds: 90, sets: [{ reps: 8 }, {}] }],
})

describe('store IndexedDB', () => {
  it('primo avvio senza dati: esercizi di base, data gara predefinita, persistenza richiesta', async () => {
    const b = browser()
    const store = b.open()
    expect((await store.loadExercises()).map((e) => e.name)).toEqual([
      'Panca piana',
      'Lat machine',
      'Leg press',
      'Rematore',
    ])
    expect(await store.loadTemplates()).toEqual([])
    expect(await store.loadSessions()).toEqual([])
    expect(await store.loadRaceDate()).toBe(DEFAULT_RACE_DATE)
    expect(b.persistRequests()).toBe(1)
  })

  it('salva e rilegge mantenendo l’ordine, anche dopo la riapertura', async () => {
    const b = browser()
    const store = b.open()
    await store.saveExercises([exercise('c'), exercise('a'), exercise('b')])
    await store.saveTemplates([template('t2'), template('t1')])
    await store.saveRaceDate(null)
    const again = b.open()
    expect((await again.loadExercises()).map((e) => e.id)).toEqual([
      'c',
      'a',
      'b',
    ])
    expect(await again.loadTemplates()).toEqual([
      template('t2'),
      template('t1'),
    ])
    expect(await again.loadRaceDate()).toBeNull()
    // un elemento tolto dall'elenco sparisce
    await again.saveExercises([exercise('a')])
    expect((await b.open().loadExercises()).map((e) => e.id)).toEqual(['a'])
  })

  it('migra il vecchio localStorage e tiene le chiavi come backup', async () => {
    const oldTemplates = JSON.stringify([
      {
        ...template('vecchio'),
        entries: [
          {
            exerciseId: 'a',
            restSeconds: 90,
            sets: [{ reps: 8, kg: 60, rir: 2 }],
          },
        ],
      },
    ])
    const oldExercises = JSON.stringify([
      { ...exercise('a'), muscles: [{ muscle: 'Petto', percent: 100 }] },
    ])
    const { storage, map } = memoryStorage({
      'mm.exercises': oldExercises,
      'mm.templates': oldTemplates,
      'mm.sessions': JSON.stringify([{ id: 'demo', vecchio: true }]),
      'mm.raceDate': 'null',
      'mm.theme': 'dark',
    })
    const b = browser(storage)
    const store = b.open()

    expect((await store.loadExercises())[0].muscles).toEqual([
      { muscle: 'chest', percent: 100 },
    ])
    const [tpl] = (await store.loadTemplates()) as StrengthTemplate[]
    expect(tpl.entries[0].sets).toEqual([{ reps: 8, rir: 2 }])
    expect(await store.loadSessions()).toEqual([]) // formato dimostrativo: scartato
    expect(await store.loadRaceDate()).toBeNull()

    // chiavi vecchie → copie di backup; le preferenze non si toccano
    expect(map.get('mm.templates')).toBeUndefined()
    expect(map.get('mm.templates.backup-idb')).toBe(oldTemplates)
    expect(map.get('mm.exercises.backup-idb')).toBe(oldExercises)
    expect(map.get('mm.theme')).toBe('dark')

    // alla riapertura non si rimigra: valgono i dati di IndexedDB
    await store.saveTemplates([])
    expect(await b.open().loadTemplates()).toEqual([])

    // se IndexedDB viene svuotato, si riparte dalla copia di backup
    const wiped = browser(storage).open()
    expect((await wiped.loadTemplates()).map((x) => x.id)).toEqual(['vecchio'])
  })

  it('backup automatico: subito, poi solo dopo 7 giorni, al massimo 8', async () => {
    const b = browser()
    await b.open().init()
    expect(await b.open().listBackups()).toHaveLength(1)

    b.clock.now = new Date(t0.getTime() + 6 * DAY)
    expect(await b.open().listBackups()).toHaveLength(1)

    b.clock.now = new Date(t0.getTime() + 8 * DAY)
    const backups = await b.open().listBackups()
    expect(backups).toHaveLength(2)
    expect(backups[0]).toMatchObject({
      reason: 'auto',
      schemaVersion: SCHEMA_VERSION,
      createdAt: b.clock.now.toISOString(),
      counts: { exercises: 4, templates: 0, sessions: 0 },
    })

    for (let week = 2; week < 12; week++) {
      b.clock.now = new Date(t0.getTime() + week * 8 * DAY)
      await b.open().init()
    }
    const kept = await b.open().listBackups()
    expect(kept).toHaveLength(MAX_BACKUPS)
    expect(kept[0].createdAt).toBe(b.clock.now.toISOString()) // dal più recente
  })

  it('ripristina un backup e salva prima i dati attuali', async () => {
    const b = browser()
    const store = b.open()
    await store.saveExercises([exercise('prima')])
    b.clock.now = new Date(t0.getTime() + 8 * DAY)
    const later = b.open()
    const [snapshot] = await later.listBackups() // contiene "prima"
    await later.saveExercises([exercise('dopo')])

    await later.restoreBackup(snapshot.id)
    expect((await later.loadExercises()).map((e) => e.id)).toEqual(['prima'])
    const [safety] = await later.listBackups()
    expect(safety).toMatchObject({ reason: 'pre-restore' })
    await later.restoreBackup(safety.id)
    expect((await later.loadExercises()).map((e) => e.id)).toEqual(['dopo'])
  })

  it('export e import: sostituisce tutto, con backup di sicurezza', async () => {
    const b = browser()
    const store = b.open()
    await store.saveExercises([exercise('a')])
    await store.saveTemplates([template('t')])
    expect(await store.lastExportAt()).toBeNull()
    const file = await store.exportAll()
    await store.markExported()
    expect(await store.lastExportAt()).toBe(t0.toISOString())
    expect(file).toMatchObject({
      schemaVersion: SCHEMA_VERSION,
      exportedAt: t0.toISOString(),
      data: { exercises: [exercise('a')], templates: [template('t')] },
    })

    const other = browser().open()
    await other.replaceAll(file.data)
    expect(await other.loadTemplates()).toEqual([template('t')])
    expect((await other.loadExercises()).map((e) => e.id)).toEqual(['a'])
    expect((await other.listBackups())[0]).toMatchObject({
      reason: 'pre-import',
      counts: { exercises: 4 },
    })
  })

  it('all’avvio migra un database con schema vecchio, dopo un backup', async () => {
    const b = browser()
    const store = b.open()
    await store.saveTemplates([template('t')])

    // riporta il database allo schema v1: serie con i kg
    const raw = new Dexie(DB_NAME, b.idb)
    await raw.open()
    await raw.table('meta').put({ key: 'schemaVersion', value: 1 })
    const row = await raw.table('templates').get('t')
    row.item.entries[0].sets = [{ reps: 8, kg: 60, rir: 2 }]
    await raw.table('templates').put(row)
    raw.close()

    const migrated = b.open()
    const [tpl] = (await migrated.loadTemplates()) as StrengthTemplate[]
    expect(tpl.entries[0].sets).toEqual([{ reps: 8, rir: 2 }])
    const [backup] = await migrated.listBackups()
    expect(backup).toMatchObject({ reason: 'pre-migration', schemaVersion: 1 })
    // ripristinare quel backup vecchio riapplica le migrazioni
    await migrated.restoreBackup(backup.id)
    const [restored] = (await migrated.loadTemplates()) as StrengthTemplate[]
    expect(restored.entries[0].sets).toEqual([{ reps: 8, rir: 2 }])
  })

  it('allenamento in corso: la bozza sopravvive alla riapertura e si cancella con null', async () => {
    const b = browser()
    const store = b.open()
    expect(await store.loadLiveWorkout()).toBeNull()
    const live: LiveWorkout = {
      version: 1,
      sessionId: 's1',
      startedAt: t0.toISOString(),
      exercises: [
        {
          id: 'e1',
          exerciseId: 'a',
          restSeconds: 90,
          skipped: false,
          sets: [{ id: 'x', kg: '60', reps: '', targetReps: 8 }],
        },
      ],
      focus: { exercise: 'e1', set: 0 },
      rest: { endsAt: t0.getTime() + 90_000, totalS: 90 },
    }
    await store.saveLiveWorkout(live)
    expect(await b.open().loadLiveWorkout()).toEqual(live)
    await store.saveLiveWorkout(null)
    expect(await b.open().loadLiveWorkout()).toBeNull()
  })

  it('blocchi, fasi e applicazioni: salvati, riletti, esportati', async () => {
    const b = browser()
    const store = b.open()
    const stamp = t0.toISOString()
    const block: TrainingBlock = {
      id: 'b1',
      createdAt: stamp,
      updatedAt: stamp,
      name: 'Carico',
      weeks: [
        {
          id: 'w1',
          days: [
            [{ id: 'i1', kind: 'empty', discipline: 'run' }],
            [],
            [],
            [],
            [],
            [],
            [],
          ],
        },
      ],
      archived: false,
    }
    const phase: Phase = {
      id: 'p1',
      createdAt: stamp,
      updatedAt: stamp,
      name: 'Base',
      blockIds: ['b1', 'b1'],
      archived: false,
    }
    const app: BlockApplication = {
      id: 'a1',
      createdAt: stamp,
      updatedAt: stamp,
      kind: 'block',
      sourceId: 'b1',
      name: 'Carico',
      startDate: '2026-11-23',
      weeks: [
        {
          start: '2026-11-23',
          blockId: 'b1',
          blockName: 'Carico',
          week: 1,
          weeks: 1,
        },
      ],
    }
    await store.saveBlocks([block])
    await store.savePhases([phase])
    await store.saveSessionsAndApplications([], [app])
    const again = b.open()
    expect(await again.loadBlocks()).toEqual([block])
    expect(await again.loadPhases()).toEqual([phase])
    expect(await again.loadApplications()).toEqual([app])
    const file = await again.exportAll()
    expect(file.data).toMatchObject({
      blocks: [block],
      phases: [phase],
      applications: [app],
    })
  })

  it('senza IndexedDB l’app parte lo stesso, con i dati in memoria', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = createDexieStore({
      idb: { indexedDB: undefined, IDBKeyRange: undefined },
      now: () => t0,
    })
    expect(await store.loadExercises()).toHaveLength(4)
    await store.saveExercises([exercise('a')])
    expect((await store.loadExercises()).map((e) => e.id)).toEqual(['a'])
    expect(await store.listBackups()).toEqual([])
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })
})
