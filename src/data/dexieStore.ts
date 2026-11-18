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
import { normalizeListItem, normalizeMeta } from './sync/items'
import {
  EPOCH,
  LIST_KINDS,
  META_IDS,
  type ListKind,
  type MetaId,
  type SyncChange,
  type SyncKind,
  type SyncLocal,
  type SyncMeta,
} from './sync/types'
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
  /** Ora dell'ultima modifica (per la sincronizzazione); assente = mai modificata dalla v3. */
  updatedAt?: IsoDateTime
}

interface MetaRow {
  key:
    | 'schemaVersion'
    | 'raceDate'
    | 'lastExportAt'
    | 'legacyImportedAt'
    | 'liveWorkout'
    | 'settings'
    /** Dispositivo appena installato, mai modificato: al primo login vincono i dati del server. */
    | 'pristine'
    /** Ultima sincronizzazione (`SyncMeta`). */
    | 'sync'
  value: unknown
  /** Solo per `raceDate` e `settings`: ora dell'ultima modifica. */
  updatedAt?: IsoDateTime
}

/** Modifica locale da inviare al server (una per voce: conta l'ultima). */
interface ChangeRow {
  /** `<kind>/<id>` */
  key: string
  kind: SyncKind
  id: string
  updatedAt: IsoDateTime
  deleted: boolean
}

interface BackupRow {
  id?: number
  createdAt: IsoDateTime
  reason: BackupReason
  schemaVersion: number
  data: RawData
}

type ListKey = ListKind

const changeKey = (kind: SyncKind, id: string) => `${kind}/${id}`
const sameJson = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b)

class MmDb extends Dexie {
  exercises!: Table<Row, string>
  templates!: Table<Row, string>
  sessions!: Table<Row, string>
  blocks!: Table<Row, string>
  phases!: Table<Row, string>
  applications!: Table<Row, string>
  meta!: Table<MetaRow, string>
  backups!: Table<BackupRow, number>
  changes!: Table<ChangeRow, string>

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
    // v3: coda delle modifiche da sincronizzare
    this.version(3).stores({
      changes: 'key',
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

export function createDexieStore(
  options: DexieStoreOptions = {},
): DataStore & SyncLocal {
  const now = options.now ?? (() => new Date())
  const legacy = options.legacy ?? null
  const db = new MmDb(options.dbName ?? DB_NAME, options.idb)
  const lists = [
    db.exercises,
    db.templates,
    db.sessions,
    db.blocks,
    db.phases,
    db.applications,
  ]
  const all = [...lists, db.meta, db.backups, db.changes]

  /** Se IndexedDB non è disponibile i dati vivono solo in memoria, per questa sessione. */
  let mem: AppData | null = null
  let memLive: LiveWorkout | null = null
  let ready: Promise<void> | null = null

  /** Salvataggi locali (per la sincronizzazione) e dati arrivati dal server (per le pagine). */
  const localListeners = new Set<() => void>()
  const remoteListeners = new Set<() => void>()
  const emit = (set: Set<() => void>) => set.forEach((fn) => fn())
  const listen = (set: Set<() => void>, fn: () => void) => {
    set.add(fn)
    return () => {
      set.delete(fn)
    }
  }

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

  /** Mette in coda la modifica di una voce; il dispositivo non è più "appena installato". */
  const queue = async (
    kind: SyncKind,
    id: string,
    updatedAt: IsoDateTime,
    deleted: boolean,
  ) => {
    await db.changes.put({
      key: changeKey(kind, id),
      kind,
      id,
      updatedAt,
      deleted,
    })
  }

  /**
   * Scrive un elenco intero. Con `track` le voci nuove, cambiate (anche solo di
   * posizione) o tolte vanno nella coda della sincronizzazione.
   */
  const writeList = async (
    key: ListKey,
    items: { id: string }[],
    track = true,
  ) => {
    if (!track) {
      await db[key].clear()
      await db[key].bulkPut(
        items.map((item, pos) => ({ id: item.id, pos, item })),
      )
      return
    }
    const old = new Map((await db[key].toArray()).map((r) => [r.id, r]))
    const stamp = now().toISOString()
    const changed: Row[] = []
    items.forEach((item, pos) => {
      const prev = old.get(item.id)
      old.delete(item.id)
      if (prev && prev.pos === pos && sameJson(prev.item, item)) return
      changed.push({ id: item.id, pos, item, updatedAt: stamp })
    })
    const removed = [...old.keys()]
    if (changed.length === 0 && removed.length === 0) return
    await db[key].bulkDelete(removed)
    await db[key].bulkPut(changed)
    for (const r of changed) await queue(key, r.id, stamp, false)
    for (const id of removed) await queue(key, id, stamp, true)
    await db.meta.delete('pristine')
  }

  /** Data gara o impostazioni; con `track` in coda se il valore cambia. */
  const writeMeta = async (key: MetaId, value: unknown, track = true) => {
    if (!track) {
      await db.meta.put({ key, value })
      return
    }
    const prev = await db.meta.get(key)
    if (prev && sameJson(prev.value, value)) return
    const stamp = now().toISOString()
    await db.meta.put({ key, value, updatedAt: stamp })
    await queue('meta', key, stamp, false)
    await db.meta.delete('pristine')
  }

  const writeAll = async (data: AppData, track = true) => {
    for (const key of LIST_KINDS) await writeList(key, data[key], track)
    await writeMeta('raceDate', data.raceDate, track)
    await writeMeta('settings', data.settings, track)
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
      await db.transaction('rw', all, async () => {
        if (old) {
          await writeAll(fromLegacy(old))
          await db.meta.put({
            key: 'legacyImportedAt',
            value: now().toISOString(),
          })
        } else {
          // dati di partenza: non sono modifiche dell'utente
          await writeAll(freshData(), false)
          await db.meta.put({ key: 'pristine', value: true })
        }
        await db.meta.put({ key: 'schemaVersion', value: SCHEMA_VERSION })
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

  /** Esegue una scrittura tracciata e avvisa la sincronizzazione. */
  const tracked = async (
    label: string,
    tables: Table[],
    write: () => Promise<void>,
  ) => {
    try {
      await db.transaction('rw', [...tables, db.meta, db.changes], write)
      emit(localListeners)
    } catch (error) {
      console.error(`Salvataggio non riuscito (${label})`, error)
    }
  }

  const save = async (key: ListKey, items: { id: string }[]) => {
    await init()
    if (mem) {
      mem = { ...mem, [key]: items }
      return
    }
    await tracked(key, [db[key]], () => writeList(key, items))
  }

  const current = async (): Promise<AppData> => {
    await init()
    return mem ?? sanitize(await db.transaction('r', all, readRaw)).data
  }

  // ---------- sincronizzazione (lato dispositivo) ----------

  const sync: SyncLocal = {
    async pendingChanges() {
      await init()
      if (mem) return []
      return db.transaction('r', all, async () => {
        const out: SyncChange[] = []
        for (const c of await db.changes.toArray()) {
          const base = {
            kind: c.kind,
            id: c.id,
            updatedAt: c.updatedAt,
            schemaVersion: SCHEMA_VERSION,
          }
          if (c.kind === 'meta') {
            const row = await db.meta.get(c.id)
            out.push({
              ...base,
              pos: 0,
              item: row?.value ?? null,
              deleted: false,
            })
            continue
          }
          const row = c.deleted ? undefined : await db[c.kind].get(c.id)
          out.push(
            row
              ? { ...base, pos: row.pos, item: row.item, deleted: false }
              : { ...base, pos: 0, item: null, deleted: true },
          )
        }
        return out
      })
    },

    async ackChanges(sent) {
      await init()
      if (mem || sent.length === 0) return
      await db.transaction('rw', db.changes, async () => {
        for (const c of sent) {
          const key = changeKey(c.kind, c.id)
          const row = await db.changes.get(key)
          if (row && row.updatedAt === c.updatedAt) await db.changes.delete(key)
        }
      })
    },

    async applyRemote(changes) {
      await init()
      if (mem || changes.length === 0) return 0
      let applied = 0
      await db.transaction('rw', all, async () => {
        for (const c of changes) {
          const key = changeKey(c.kind, c.id)
          const pending = await db.changes.get(key)
          if (c.kind === 'meta') {
            if (!(META_IDS as readonly string[]).includes(c.id) || c.deleted)
              continue
            const id = c.id as MetaId
            const row = await db.meta.get(id)
            const localAt = latest(row?.updatedAt, pending?.updatedAt)
            if (c.updatedAt <= localAt) continue
            const value = normalizeMeta(id, c.item, c.schemaVersion)
            await db.meta.put({ key: id, value, updatedAt: c.updatedAt })
          } else {
            if (!(LIST_KINDS as readonly string[]).includes(c.kind)) continue
            const row = await db[c.kind].get(c.id)
            const localAt = latest(row?.updatedAt, pending?.updatedAt)
            if (c.updatedAt <= localAt) continue
            if (c.deleted) {
              await db[c.kind].delete(c.id)
            } else {
              const item = normalizeListItem(c.kind, c.item, c.schemaVersion)
              if (!item || item.id !== c.id) continue
              await db[c.kind].put({
                id: c.id,
                pos: c.pos,
                item,
                updatedAt: c.updatedAt,
              })
            }
          }
          if (pending) await db.changes.delete(key)
          applied += 1
        }
      })
      if (applied > 0) emit(remoteListeners)
      return applied
    },

    async startAccount(remoteHasData) {
      await init()
      if (mem) return
      await db.transaction('rw', all, async () => {
        await addBackup('pre-sync', await readRaw(), SCHEMA_VERSION)
        const pristine = (await db.meta.get('pristine'))?.value === true
        await db.meta.delete('pristine')
        if (pristine && remoteHasData) {
          // dispositivo nuovo: i dati di partenza lasciano il posto a quelli del server
          for (const table of lists) await table.clear()
          await db.changes.clear()
          return
        }
        for (const kind of LIST_KINDS) {
          for (const row of await db[kind].toArray()) {
            const at = row.updatedAt ?? EPOCH
            if (!row.updatedAt) await db[kind].put({ ...row, updatedAt: at })
            await queue(kind, row.id, at, false)
          }
        }
        for (const id of META_IDS) {
          const row = await db.meta.get(id)
          if (!row) continue
          const at = row.updatedAt ?? EPOCH
          if (!row.updatedAt) await db.meta.put({ ...row, updatedAt: at })
          await queue('meta', id, at, false)
        }
      })
    },

    async getSyncMeta() {
      await init()
      if (mem) return null
      const value = (await db.meta.get('sync'))?.value
      return isSyncMeta(value) ? value : null
    },
    async setSyncMeta(meta) {
      await init()
      if (mem) return
      if (meta) await db.meta.put({ key: 'sync', value: meta })
      else await db.meta.delete('sync')
    },

    onLocalChange: (fn) => listen(localListeners, fn),
  }

  return {
    ...sync,
    subscribe: (fn) => listen(remoteListeners, fn),
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
      await tracked(
        'applicazione',
        [db.sessions, db.applications],
        async () => {
          await writeList('sessions', sessions)
          await writeList('applications', applications)
        },
      )
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
      await tracked('raceDate', [], () => writeMeta('raceDate', date))
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
      await tracked('settings', [], () => writeMeta('settings', settings))
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
      emit(localListeners)
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
      emit(localListeners)
    },
  }
}

/** La più recente di due ore ISO (stringa vuota se nessuna). */
function latest(a?: IsoDateTime, b?: IsoDateTime): IsoDateTime {
  const x = a ?? ''
  const y = b ?? ''
  return x > y ? x : y
}

function isSyncMeta(v: unknown): v is SyncMeta {
  if (!v || typeof v !== 'object') return false
  const m = v as Record<string, unknown>
  return (
    typeof m.userId === 'string' &&
    (m.cursor === null || typeof m.cursor === 'string') &&
    typeof m.lastSyncAt === 'string'
  )
}
