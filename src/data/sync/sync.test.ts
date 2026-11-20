import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { createDexieStore } from '../dexieStore'
import { SCHEMA_VERSION } from '../migrations'
import type { Exercise, ImportRecord, Session } from '../types'
import { insertSession, removeSession } from '../../lib/sessions'
import { createSyncEngine } from './engine'
import type { RemoteChange, SyncChange, SyncRemote } from './types'

const t0 = new Date('2026-11-18T08:00:00.000Z')

const exercise = (id: string, name = id): Exercise => ({
  id,
  createdAt: t0.toISOString(),
  updatedAt: t0.toISOString(),
  name,
  muscles: [{ muscle: 'chest', percent: 100 }],
  defaultRestSeconds: 120,
  archived: false,
})

/** Server finto con le stesse regole di `push_items`: vince la voce più recente. */
function fakeServer() {
  const rows = new Map<string, RemoteChange>()
  let tick = 0
  const serverNow = () =>
    new Date(Date.UTC(2030, 0, 1) + (tick += 1000)).toISOString()
  const api: SyncRemote = {
    async pull(since) {
      return [...rows.values()]
        .filter((r) => !since || r.serverAt > since)
        .sort((a, b) => a.serverAt.localeCompare(b.serverAt))
    },
    async push(changes: SyncChange[]) {
      for (const c of changes) {
        const key = `${c.kind}/${c.id}`
        const prev = rows.get(key)
        if (prev && prev.updatedAt >= c.updatedAt) continue
        rows.set(key, {
          ...c,
          item: c.deleted ? null : structuredClone(c.item),
          serverAt: serverNow(),
        })
      }
    },
  }
  return { api, rows }
}

/** Un dispositivo: IndexedDB proprio, orologio regolabile, motore collegato al server. */
function device(server: ReturnType<typeof fakeServer>, userId = 'u1') {
  const clock = { now: t0 }
  const store = createDexieStore({
    idb: { indexedDB: new IDBFactory(), IDBKeyRange },
    now: () => clock.now,
    requestPersistence: async () => true,
  })
  const engine = createSyncEngine({ local: store, now: () => clock.now })
  const connect = () => engine.setRemote({ userId, api: server.api })
  const later = (ms: number) => {
    clock.now = new Date(clock.now.getTime() + ms)
  }
  return { store, engine, connect, clock, later }
}

const names = async (d: ReturnType<typeof device>) =>
  (await d.store.loadExercises()).map((e) => e.name)

describe('sincronizzazione', () => {
  it('primo dispositivo: invia tutto; il secondo, appena installato, prende i dati del server', async () => {
    const server = fakeServer()
    const a = device(server)
    await a.store.saveExercises([exercise('x1', 'Panca'), exercise('x2')])
    await a.store.saveRaceDate('2028-08-01')
    await a.connect()
    await a.engine.syncNow()
    expect(a.engine.getState().status).toBe('idle')
    expect(server.rows.get('exercises/x1')?.item).toMatchObject({
      name: 'Panca',
    })

    const b = device(server)
    await b.store.init()
    await b.connect()
    await b.engine.syncNow()
    expect(await names(b)).toEqual(['Panca', 'x2'])
    expect(await b.store.loadRaceDate()).toBe('2028-08-01')
    // i dati di partenza del dispositivo nuovo non finiscono sul server
    expect(
      [...server.rows.entries()]
        .filter(([k, r]) => k.startsWith('exercises/') && !r.deleted)
        .map(([k]) => k),
    ).toEqual(['exercises/x1', 'exercises/x2'])
    // prima del primo collegamento si salva un backup
    expect((await b.store.listBackups())[0].reason).toBe('pre-sync')
  })

  it('modifiche e cancellazioni passano da un dispositivo all’altro', async () => {
    const server = fakeServer()
    const a = device(server)
    const b = device(server)
    await a.store.saveExercises([exercise('x1'), exercise('x2')])
    await a.connect()
    await a.engine.syncNow()
    await b.store.init()
    await b.connect()
    await b.engine.syncNow()

    a.later(60_000)
    await a.store.saveExercises([exercise('x1', 'Squat')])
    await a.engine.syncNow()
    let notified = 0
    b.store.subscribe(() => (notified += 1))
    await b.engine.syncNow()
    expect(await names(b)).toEqual(['Squat'])
    expect(notified).toBe(1)
    expect(server.rows.get('exercises/x2')?.deleted).toBe(true)
  })

  it('conflitto: vince la modifica più recente, anche se inviata prima', async () => {
    const server = fakeServer()
    const a = device(server)
    const b = device(server)
    await a.store.saveExercises([exercise('x1')])
    await a.connect()
    await a.engine.syncNow()
    await b.store.init()
    await b.connect()
    await b.engine.syncNow()

    b.later(10_000)
    a.later(20_000)
    await b.store.saveExercises([exercise('x1', 'B')])
    await a.store.saveExercises([exercise('x1', 'A')]) // più recente
    await a.engine.syncNow()
    await b.engine.syncNow() // la modifica di B è più vecchia: perde
    await a.engine.syncNow()
    expect(await names(a)).toEqual(['A'])
    expect(await names(b)).toEqual(['A'])
  })

  it('un dispositivo già usato al primo login unisce i dati: le voci mai sincronizzate perdono', async () => {
    const server = fakeServer()
    const a = device(server)
    await a.store.saveExercises([exercise('x1', 'Server')])
    await a.connect()
    await a.engine.syncNow()

    const b = device(server)
    b.later(1000)
    await b.store.saveExercises([exercise('x1', 'Locale'), exercise('y1')])
    // come un dispositivo con dati di prima della sincronizzazione
    await b.store.ackChanges(await b.store.pendingChanges())
    await b.connect()
    await b.engine.syncNow()
    // x1 ha un'ora reale su B (modificato dopo la v3): vince la più recente, cioè quella di B
    expect((await names(b)).sort()).toEqual(['Locale', 'y1'])
    expect(server.rows.has('exercises/y1')).toBe(true)
    await a.engine.syncNow()
    expect((await names(a)).sort()).toEqual(['Locale', 'y1'])
  })

  it('dati di una versione più recente: si ferma senza toccare nulla', async () => {
    const server = fakeServer()
    server.rows.set('exercises/z', {
      kind: 'exercises',
      id: 'z',
      pos: 0,
      item: exercise('z'),
      deleted: false,
      updatedAt: t0.toISOString(),
      serverAt: t0.toISOString(),
      schemaVersion: SCHEMA_VERSION + 1,
    })
    const a = device(server)
    await a.store.saveExercises([exercise('x1')])
    await a.connect()
    await a.engine.syncNow()
    expect(a.engine.getState().status).toBe('newer')
    expect(await names(a)).toEqual(['x1'])
    expect(server.rows.has('exercises/x1')).toBe(false)
  })

  it('senza connessione o con errore del server lo stato lo dice e le modifiche restano in coda', async () => {
    const server = fakeServer()
    const a = device(server)
    let online = false
    const engine = createSyncEngine({ local: a.store, isOnline: () => online })
    await engine.setRemote({ userId: 'u1', api: server.api })
    await a.store.saveExercises([exercise('x1')])
    await engine.syncNow()
    expect(engine.getState().status).toBe('offline')

    online = true
    await engine.setRemote({
      userId: 'u1',
      api: {
        pull: () => Promise.reject(new Error('paused')),
        push: server.api.push,
      },
    })
    await engine.syncNow()
    expect(engine.getState().status).toBe('error')
    expect((await a.store.pendingChanges()).length).toBeGreaterThan(0)
  })

  it('le voci non valide dal server si scartano', async () => {
    const server = fakeServer()
    server.rows.set('exercises/bad', {
      kind: 'exercises',
      id: 'bad',
      pos: 0,
      item: { id: 'bad' },
      deleted: false,
      updatedAt: t0.toISOString(),
      serverAt: t0.toISOString(),
      schemaVersion: SCHEMA_VERSION,
    })
    const a = device(server)
    await a.store.saveExercises([exercise('x1')])
    await a.connect()
    await a.engine.syncNow()
    expect(await names(a)).toEqual(['x1'])
  })

  it('uscendo dall’account i dati restano sul dispositivo', async () => {
    const server = fakeServer()
    const a = device(server)
    await a.store.saveExercises([exercise('x1')])
    await a.connect()
    await a.engine.syncNow()
    await a.engine.setRemote(null)
    expect(a.engine.getState().status).toBe('off')
    expect(await names(a)).toEqual(['x1'])
    expect(await a.store.getSyncMeta()).toBeNull()
  })

  it('un salvataggio senza cambiamenti non mette nulla in coda', async () => {
    const server = fakeServer()
    const a = device(server)
    await a.store.saveExercises([exercise('x1')])
    await a.connect()
    await a.engine.syncNow()
    expect(await a.store.pendingChanges()).toEqual([])
    await a.store.saveExercises([exercise('x1')])
    await a.store.saveSettings(await a.store.loadSettings())
    expect(await a.store.pendingChanges()).toEqual([])
  })
})

const session = (id: string, date: string, order = 0): Session => ({
  id,
  createdAt: t0.toISOString(),
  updatedAt: t0.toISOString(),
  date,
  order,
  status: 'planned',
  name: id,
  discipline: 'strength',
  plan: { entries: [] },
})

describe('salvataggi su dati vecchi (B1)', () => {
  it('Termina del live non cancella né riporta indietro ciò che è arrivato durante l’allenamento', async () => {
    const server = fakeServer()
    const pc = device(server)
    const phone = device(server)
    await phone.store.update(['sessions'], () => ({
      sessions: [
        session('corsa', '2026-11-18'),
        session('forza', '2026-11-18', 1),
      ],
    }))
    await phone.connect()
    await phone.engine.syncNow()
    await pc.store.init()
    await pc.connect()
    await pc.engine.syncNow()

    // il live legge le sedute all'apertura
    const atOpen = await phone.store.loadSessions()
    expect(atOpen).toHaveLength(2)

    // durante l'allenamento: la corsa viene collegata sul telefono, il PC crea una seduta
    phone.later(60_000)
    await phone.store.update(['sessions'], ({ sessions }) => ({
      sessions: sessions.map((s) =>
        s.id === 'corsa' ? { ...s, status: 'done' as const } : s,
      ),
    }))
    pc.later(60_000)
    await pc.store.update(['sessions'], ({ sessions }) => ({
      sessions: [...sessions, session('nuoto', '2026-11-19')],
    }))
    await pc.engine.syncNow()
    await phone.engine.syncNow()

    // Termina: la modifica si applica alle sedute di adesso, non alla copia dell'apertura
    phone.later(60_000)
    const saved = await phone.store.update(['sessions'], ({ sessions }) => ({
      sessions: sessions.map((s) =>
        s.id === 'forza' ? { ...s, status: 'done' as const } : s,
      ),
    }))
    expect(saved?.sessions.map((s) => `${s.id}:${s.status}`).sort()).toEqual([
      'corsa:done',
      'forza:done',
      'nuoto:planned',
    ])
    await phone.engine.syncNow()
    await pc.engine.syncNow()
    expect(server.rows.get('sessions/nuoto')?.deleted).toBe(false)
    expect(
      (await pc.store.loadSessions()).map((s) => `${s.id}:${s.status}`).sort(),
    ).toEqual(['corsa:done', 'forza:done', 'nuoto:planned'])
  })

  it('due schede: la modifica di una non cancella ciò che ha creato l’altra', async () => {
    const idb = { indexedDB: new IDBFactory(), IDBKeyRange }
    const open = () =>
      createDexieStore({
        idb,
        now: () => t0,
        requestPersistence: async () => true,
      })
    const tab1 = open()
    const tab2 = open()
    await tab1.update(['exercises'], () => ({ exercises: [exercise('a')] }))
    await tab2.update(['exercises'], ({ exercises }) => ({
      exercises: [...exercises, exercise('b')],
    }))
    // la scheda 1 (ferma a [a]) rinomina "a"
    await tab1.update(['exercises'], ({ exercises }) => ({
      exercises: exercises.map((e) => (e.id === 'a' ? { ...e, name: 'A' } : e)),
    }))
    expect((await tab2.loadExercises()).map((e) => e.name)).toEqual(['A', 'b'])
  })

  it('una modifica che non cambia nulla non scrive', async () => {
    const server = fakeServer()
    const a = device(server)
    await a.store.update(['exercises'], () => ({ exercises: [exercise('x')] }))
    await a.connect()
    await a.engine.syncNow()
    expect(await a.store.update(['exercises'], () => null)).toMatchObject({
      exercises: [{ id: 'x' }],
    })
    expect(await a.store.pendingChanges()).toEqual([])
  })
})

describe('cambi di sola posizione (B2)', () => {
  it('telefono offline registra, il PC elimina una seduta precedente: l’allenamento resta', async () => {
    const server = fakeServer()
    const pc = device(server)
    const phone = device(server)
    const day = '2026-11-18'
    await pc.store.update(['sessions'], () => ({
      sessions: [
        session('s1', '2026-11-16'),
        session('s2', day),
        session('s3', day, 1),
        session('s4', '2026-11-19'),
      ],
    }))
    await pc.connect()
    await pc.engine.syncNow()
    await phone.store.init()
    await phone.connect()
    await phone.engine.syncNow()

    // in palestra, senza rete
    phone.later(60_000)
    await phone.store.update(['sessions'], ({ sessions }) => ({
      sessions: sessions.map((s) =>
        s.id === 's3' ? { ...s, status: 'done' as const } : s,
      ),
    }))
    // dopo, sul PC: si elimina una seduta che viene prima nell'elenco
    pc.later(120_000)
    await pc.store.update(['sessions'], ({ sessions }) => ({
      sessions: removeSession(sessions, 's1', pc.clock.now.toISOString()),
    }))
    expect((await pc.store.pendingChanges()).map((c) => c.id)).toEqual(['s1'])
    await pc.engine.syncNow()
    await phone.engine.syncNow()
    await pc.engine.syncNow()

    for (const d of [pc, phone]) {
      const s3 = (await d.store.loadSessions()).find((s) => s.id === 's3')
      expect(s3?.status).toBe('done')
    }
  })

  it('aggiungere una seduta mette in coda una sola voce', async () => {
    const server = fakeServer()
    const a = device(server)
    const day = '2026-11-18'
    await a.store.update(['sessions'], () => ({
      sessions: [
        session('s1', day),
        session('s2', day, 1),
        session('s3', '2026-11-19'),
      ],
    }))
    await a.connect()
    await a.engine.syncNow()
    a.later(60_000)
    await a.store.update(['sessions'], ({ sessions }) => ({
      sessions: insertSession(sessions, session('n', day), day, 2),
    }))
    expect((await a.store.pendingChanges()).map((c) => c.id)).toEqual(['n'])
  })
})

const record = (
  id: string,
  extra: Partial<ImportRecord> = {},
): ImportRecord => ({
  id,
  createdAt: t0.toISOString(),
  updatedAt: t0.toISOString(),
  source: 'file',
  startedAt: t0.toISOString(),
  ...extra,
})

describe('ricomincia da zero e recupero', () => {
  it('il reset cancella tutto, anche sugli altri dispositivi, e svuota la cache dei FIT', async () => {
    const server = fakeServer()
    const a = device(server)
    await a.store.saveExercises([exercise('x1', 'Panca')])
    await a.store.saveImports([record('fit-1')])
    await a.store.putFitFile('fit-1', new Uint8Array([1, 2, 3]))
    await a.store.saveRaceDate('2028-08-01')
    await a.connect()
    await a.engine.syncNow()

    const b = device(server)
    await b.connect()
    await b.engine.syncNow()
    await b.store.putFitFile('fit-1', new Uint8Array([1, 2, 3]))
    expect(await names(b)).toEqual(['Panca'])

    a.later(60_000)
    await a.store.resetAll()
    expect(await a.store.loadImports()).toEqual([])
    expect(await a.store.loadRaceDate()).toBeNull()
    expect(await a.store.getFitFile('fit-1')).toBeNull()
    expect(await names(a)).not.toContain('Panca')
    // backup prima del reset
    expect((await a.store.listBackups())[0].reason).toBe('pre-reset')
    await a.engine.syncNow()

    b.later(120_000)
    await b.engine.syncNow()
    expect(await names(b)).not.toContain('Panca')
    expect(await b.store.loadImports()).toEqual([])
    expect(await b.store.loadRaceDate()).toBeNull()
    // il FIT dell'attività cancellata sparisce anche dalla cache dell'altro dispositivo
    expect(await b.store.getFitFile('fit-1')).toBeNull()
  })

  it("un'attività archiviata altrove toglie il FIT dalla cache", async () => {
    const server = fakeServer()
    const a = device(server)
    await a.store.saveImports([record('fit-2')])
    await a.connect()
    await a.engine.syncNow()
    const b = device(server)
    await b.connect()
    await b.engine.syncNow()
    await b.store.putFitFile('fit-2', new Uint8Array([9]))

    a.later(60_000)
    await a.store.saveImports([
      record('fit-2', { archived: true, updatedAt: a.clock.now.toISOString() }),
    ])
    await a.engine.syncNow()
    b.later(120_000)
    await b.engine.syncNow()
    expect((await b.store.loadImports())[0].archived).toBe(true)
    expect(await b.store.getFitFile('fit-2')).toBeNull()
  })

  it('requeueAll rimette in coda tutto, anche i FIT', async () => {
    const server = fakeServer()
    const a = device(server)
    await a.store.saveExercises([exercise('x1'), exercise('x2')])
    await a.store.putFitFile('fit-3', new Uint8Array([7]))
    await a.connect()
    await a.engine.syncNow()
    await a.store.markFitUploaded('fit-3')
    expect(await a.store.pendingChanges()).toEqual([])
    expect(await a.store.pendingFitUploads()).toEqual([])

    // server svuotato a mano: si ricarica da questo dispositivo
    server.rows.clear()
    a.later(60_000)
    await a.store.requeueAll()
    const pending = await a.store.pendingChanges()
    expect(
      pending
        .filter((c) => c.kind === 'exercises')
        .map((c) => c.id)
        .sort(),
    ).toEqual(['x1', 'x2'])
    expect(pending.some((c) => c.kind === 'meta' && c.id === 'settings')).toBe(
      true,
    )
    expect(await a.store.pendingFitUploads()).toEqual(['fit-3'])
    await a.engine.syncNow()
    expect(server.rows.has('exercises/x1')).toBe(true)
  })
})
