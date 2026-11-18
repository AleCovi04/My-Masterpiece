import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { createDexieStore } from '../dexieStore'
import { SCHEMA_VERSION } from '../migrations'
import type { Exercise } from '../types'
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
