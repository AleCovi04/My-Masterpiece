// Salvataggio su IndexedDB tramite Dexie. Unico modulo che tocca il database.
import Dexie, { type DexieOptions, type Table } from 'dexie'
import { buildExportFile } from './exportFile'
import {
  backupLegacyKeys,
  readLegacy,
  type LegacyStorage,
} from './legacyLocalStorage'
import { migrate, SCHEMA_VERSION, type RawData } from './migrations'
import { generateSampleExercises } from './sampleData'
import type { BackupInfo, BackupReason, DataStore } from './store'
import {
  defaultSettings,
  type AppData,
  type IsoDate,
  type IsoDateTime,
  type LiveWorkout,
} from './types'
import {
  countData,
  isLiveWorkout,
  sanitize,
  sanitizeSettings,
} from './validate'

export const DB_NAME = 'my-masterpiece'
export const DEFAULT_RACE_DATE: IsoDate = '2028-08-20'
/** Backup automatico se l'ultimo ha più di questi giorni. */
export const AUTO_BACKUP_DAYS = 7
/** Quanti backup si tengono (i più recenti). */
export const MAX_BACKUPS = 8

const DAY_MS = 864e5

/** Una riga per entità: `pos` conserva l'ordine dell'elenco. */
interface Row {
  id: string
  pos: number
  item: unknown
}

interface MetaRow {
  key:
    | 'schemaVersion'
    | 'raceDate'
    | 'lastExportAt'
    | 'legacyImportedAt'
    | 'liveWorkout'
    | 'settings'
  value: unknown
}

interface BackupRow {
  id?: number
  createdAt: IsoDateTime
  reason: BackupReason
  schemaVersion: number
  data: RawData
}

type ListKey =
  'exercises' | 'templates' | 'sessions' | 'blocks' | 'phases' | 'applications'

class MmDb extends Dexie {
  exercises!: Table<Row, string>
  templates!: Table<Row, string>
  sessions!: Table<Row, string>
  blocks!: Table<Row, string>
  phases!: Table<Row, string>
  applications!: Table<Row, string>
  meta!: Table<MetaRow, string>
  backups!: Table<BackupRow, number>

  constructor(name: string, options?: DexieOptions) {
    super(name, options)
    // Versione di Dexie = tabelle e indici. Cambia solo se cambiano quelli;
    // la forma dei dati si aggiorna con le migrazioni di `migrations.ts`.
    this.version(1).stores({
      exercises: 'id, pos',
      templates: 'id, pos',
      sessions: 'id, pos',
      meta: 'key',
      backups: '++id',
    })
    // v2: blocchi, fasi e applicazioni al calendario
    this.version(2).stores({
      blocks: 'id, pos',
      phases: 'id, pos',
      applications: 'id, pos',
    })
  }
}

export interface DexieStoreOptions {
  dbName?: string
  /** Vecchio salvataggio (localStorage) da migrare al primo avvio. */
  legacy?: LegacyStorage | null
  now?: () => Date
  /** Per i test: un IndexedDB alternativo. */
  idb?: Pick<DexieOptions, 'indexedDB' | 'IDBKeyRange'>
  /** Chiede al browser di non cancellare i dati; di default `navigator.storage.persist()`. */
  requestPersistence?: () => Promise<boolean>
}

function browserStorageManager(): StorageManager | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.storage
}

export function createDexieStore(options: DexieStoreOptions = {}): DataStore {
  const now = options.now ?? (() => new Date())
  const legacy = options.legacy ?? null
  const db = new MmDb(options.dbName ?? DB_NAME, options.idb)
  const all = [
    db.exercises,
    db.templates,
    db.sessions,
    db.blocks,
    db.phases,
    db.applications,
    db.meta,
    db.backups,
  ]

  /** Se IndexedDB non è disponibile i dati vivono solo in memoria, per questa sessione. */
  let mem: AppData | null = null
  let memLive: LiveWorkout | null = null
  let ready: Promise<void> | null = null

  const freshData = (): AppData => ({
    exercises: generateSampleExercises(now()),
    templates: [],
    sessions: [],
    blocks: [],
    phases: [],
    applications: [],
    raceDate: DEFAULT_RACE_DATE,
    settings: defaultSettings(),
  })

  /** Dai dati del vecchio salvataggio a quelli attuali; senza catalogo si parte dagli esercizi di base. */
  const fromLegacy = (old: NonNullable<ReturnType<typeof readLegacy>>) => {
    const data = sanitize(migrate(old.raw, old.version)).data
    return old.hasExercises
      ? data
      : { ...data, exercises: freshData().exercises }
  }

  // ---------- lettura e scrittura (da usare dentro una transazione) ----------

  const readList = async (key: ListKey): Promise<unknown[]> =>
    (await db[key].orderBy('pos').toArray()).map((r) => r.item)

  const readRaw = async (): Promise<RawData> => {
    const [
      exercises,
      templates,
      sessions,
      blocks,
      phases,
      applications,
      race,
      settings,
    ] = await Promise.all([
      readList('exercises'),
      readList('templates'),
      readList('sessions'),
      readList('blocks'),
      readList('phases'),
      readList('applications'),
      db.meta.get('raceDate'),
      db.meta.get('settings'),
    ])
    return {
      exercises,
      templates,
      sessions,
      blocks,
      phases,
      applications,
      raceDate: race?.value ?? null,
      ...(settings && { settings: settings.value }),
    }
  }

  const writeList = async (key: ListKey, items: { id: string }[]) => {
    await db[key].clear()
    await db[key].bulkPut(
      items.map((item, pos) => ({ id: item.id, pos, item })),
    )
  }

  const writeAll = async (data: AppData) => {
    await writeList('exercises', data.exercises)
    await writeList('templates', data.templates)
    await writeList('sessions', data.sessions)
    await writeList('blocks', data.blocks)
    await writeList('phases', data.phases)
    await writeList('applications', data.applications)
    await db.meta.put({ key: 'raceDate', value: data.raceDate })
    await db.meta.put({ key: 'settings', value: data.settings })
  }

  const addBackup = async (
    reason: BackupReason,
    data: RawData,
    schemaVersion: number,
  ) => {
    await db.backups.add({
      createdAt: now().toISOString(),
      reason,
      schemaVersion,
      data,
    })
    const ids = await db.backups.toCollection().primaryKeys()
    if (ids.length > MAX_BACKUPS) {
      await db.backups.bulkDelete(ids.slice(0, ids.length - MAX_BACKUPS))
    }
  }

  // ---------- avvio ----------

  const setup = async () => {
    await db.open()
    const stored = (await db.meta.get('schemaVersion'))?.value

    if (typeof stored !== 'number') {
      // primo avvio su questo database: si parte dal vecchio localStorage, se c'è
      const old = legacy ? readLegacy(legacy) : null
      const data = old ? fromLegacy(old) : freshData()
      await db.transaction('rw', all, async () => {
        await writeAll(data)
        await db.meta.put({ key: 'schemaVersion', value: SCHEMA_VERSION })
        if (old) {
          await db.meta.put({
            key: 'legacyImportedAt',
            value: now().toISOString(),
          })
        }
      })
      // solo a dati al sicuro in IndexedDB le chiavi vecchie diventano copie di backup
      if (old && legacy) backupLegacyKeys(legacy)
    } else if (stored < SCHEMA_VERSION) {
      await db.transaction('rw', all, async () => {
        const raw = await readRaw()
        await addBackup('pre-migration', raw, stored)
        await writeAll(sanitize(migrate(raw, stored)).data)
        await db.meta.put({ key: 'schemaVersion', value: SCHEMA_VERSION })
      })
    }

    await db.transaction('rw', all, async () => {
      const last = (await db.backups.toArray())
        .filter((b) => b.reason === 'auto')
        .pop()
      const age = last ? now().getTime() - Date.parse(last.createdAt) : Infinity
      if (age > AUTO_BACKUP_DAYS * DAY_MS) {
        await addBackup('auto', await readRaw(), SCHEMA_VERSION)
      }
    })

    // senza attendere: alcuni browser mostrano una richiesta all'utente
    const persist =
      options.requestPersistence ??
      (async () => (await browserStorageManager()?.persist?.()) ?? false)
    void persist().catch(() => false)
  }

  const init = (): Promise<void> => {
    ready ??= setup().catch((error: unknown) => {
      console.error('IndexedDB non disponibile: dati solo in memoria', error)
      const old = legacy ? readLegacy(legacy) : null
      mem = old ? fromLegacy(old) : freshData()
    })
    return ready
  }

  const load = async (key: ListKey): Promise<unknown[]> => {
    await init()
    return mem ? mem[key] : readList(key)
  }

  const save = async (key: ListKey, items: { id: string }[]) => {
    await init()
    if (mem) {
      mem = { ...mem, [key]: items }
      return
    }
    try {
      await db.transaction('rw', db[key], () => writeList(key, items))
    } catch (error) {
      console.error(`Salvataggio non riuscito (${key})`, error)
    }
  }

  const current = async (): Promise<AppData> => {
    await init()
    return mem ?? sanitize(await db.transaction('r', all, readRaw)).data
  }

  return {
    init,
    async isPersistent() {
      try {
        return (await browserStorageManager()?.persisted?.()) ?? false
      } catch {
        return false
      }
    },

    loadSessions: () => load('sessions') as Promise<AppData['sessions']>,
    saveSessions: (sessions) => save('sessions', sessions),
    loadExercises: () => load('exercises') as Promise<AppData['exercises']>,
    saveExercises: (exercises) => save('exercises', exercises),
    loadTemplates: () => load('templates') as Promise<AppData['templates']>,
    saveTemplates: (templates) => save('templates', templates),
    loadBlocks: () => load('blocks') as Promise<AppData['blocks']>,
    saveBlocks: (blocks) => save('blocks', blocks),
    loadPhases: () => load('phases') as Promise<AppData['phases']>,
    savePhases: (phases) => save('phases', phases),
    loadApplications: () =>
      load('applications') as Promise<AppData['applications']>,
    async saveSessionsAndApplications(sessions, applications) {
      await init()
      if (mem) {
        mem = { ...mem, sessions, applications }
        return
      }
      try {
        await db.transaction('rw', db.sessions, db.applications, async () => {
          await writeList('sessions', sessions)
          await writeList('applications', applications)
        })
      } catch (error) {
        console.error('Salvataggio non riuscito (applicazione)', error)
      }
    },

    async loadRaceDate() {
      return (await current()).raceDate
    },
    async saveRaceDate(date) {
      await init()
      if (mem) {
        mem = { ...mem, raceDate: date }
        return
      }
      try {
        await db.meta.put({ key: 'raceDate', value: date })
      } catch (error) {
        console.error('Salvataggio non riuscito (raceDate)', error)
      }
    },

    async loadSettings() {
      await init()
      if (mem) return mem.settings
      return sanitizeSettings((await db.meta.get('settings'))?.value)
    },
    async saveSettings(settings) {
      await init()
      if (mem) {
        mem = { ...mem, settings }
        return
      }
      try {
        await db.meta.put({ key: 'settings', value: settings })
      } catch (error) {
        console.error('Salvataggio non riuscito (settings)', error)
      }
    },

    async loadLiveWorkout() {
      await init()
      if (mem) return memLive
      const value = (await db.meta.get('liveWorkout'))?.value
      return isLiveWorkout(value) ? value : null
    },
    async saveLiveWorkout(workout) {
      await init()
      if (mem) {
        memLive = workout
        return
      }
      try {
        if (workout) await db.meta.put({ key: 'liveWorkout', value: workout })
        else await db.meta.delete('liveWorkout')
      } catch (error) {
        console.error('Salvataggio non riuscito (liveWorkout)', error)
      }
    },

    async exportAll() {
      return buildExportFile(await current(), now())
    },
    async markExported() {
      await init()
      if (mem) return
      await db.meta.put({ key: 'lastExportAt', value: now().toISOString() })
    },
    async lastExportAt() {
      await init()
      if (mem) return null
      const value = (await db.meta.get('lastExportAt'))?.value
      return typeof value === 'string' ? value : null
    },
    async replaceAll(data) {
      await init()
      if (mem) {
        mem = data
        return
      }
      await db.transaction('rw', all, async () => {
        await addBackup('pre-import', await readRaw(), SCHEMA_VERSION)
        await writeAll(data)
      })
    },

    async listBackups() {
      await init()
      if (mem) return []
      return (await db.backups.toArray())
        .map((b): BackupInfo => ({
          id: b.id as number,
          createdAt: b.createdAt,
          reason: b.reason,
          schemaVersion: b.schemaVersion,
          counts: countData(b.data),
        }))
        .reverse()
    },
    async restoreBackup(id) {
      await init()
      if (mem) return
      await db.transaction('rw', all, async () => {
        const backup = await db.backups.get(id)
        if (!backup) throw new Error(`Backup ${id} non trovato`)
        const data = sanitize(migrate(backup.data, backup.schemaVersion)).data
        await addBackup('pre-restore', await readRaw(), SCHEMA_VERSION)
        await writeAll(data)
      })
    },
  }
}
