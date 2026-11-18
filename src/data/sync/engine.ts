// Motore della sincronizzazione: scarica dal server, poi invia le modifiche locali.
// Vince la modifica più recente per singola voce (last-write-wins).
import { SCHEMA_VERSION } from '../migrations'
import type { IsoDateTime } from '../types'
import type { SyncLocal, SyncRemote } from './types'

export type SyncStatus =
  /** Nessun account collegato. */
  | 'off'
  | 'idle'
  | 'syncing'
  /** Senza connessione: si riprova al ritorno online. */
  | 'offline'
  | 'error'
  /** Sul server ci sono dati di una versione più recente dell'app. */
  | 'newer'

export interface SyncState {
  status: SyncStatus
  lastSyncAt: IsoDateTime | null
}

/** Quanto si torna indietro col cursore: copre le scritture concorrenti sul server. */
export const CURSOR_OVERLAP_MS = 5000
/** Voci per richiesta di invio. */
export const PUSH_CHUNK = 500

export interface SyncEngineOptions {
  local: SyncLocal
  now?: () => Date
  isOnline?: () => boolean
}

export interface SyncEngine {
  /** Collega (o scollega, con `null`) l'account e il server. */
  setRemote(remote: { userId: string; api: SyncRemote } | null): Promise<void>
  /** Sincronizza adesso; se è già in corso, ne fa un'altra subito dopo. */
  syncNow(): Promise<void>
  /** Sincronizza tra `delayMs` (le chiamate ravvicinate si accorpano). */
  schedule(delayMs?: number): void
  getState(): SyncState
  subscribe(listener: () => void): () => void
}

export function createSyncEngine(options: SyncEngineOptions): SyncEngine {
  const { local } = options
  const now = options.now ?? (() => new Date())
  const isOnline = options.isOnline ?? (() => true)

  let remote: { userId: string; api: SyncRemote } | null = null
  let state: SyncState = { status: 'off', lastSyncAt: null }
  let running: Promise<void> | null = null
  let again = false
  let timer: ReturnType<typeof setTimeout> | null = null
  const listeners = new Set<() => void>()

  const set = (next: Partial<SyncState>) => {
    state = { ...state, ...next }
    listeners.forEach((fn) => fn())
  }

  const runOnce = async () => {
    const r = remote
    if (!r) return set({ status: 'off' })
    if (!isOnline()) return set({ status: 'offline' })
    set({ status: 'syncing' })
    try {
      const meta = await local.getSyncMeta()
      const first = !meta || meta.userId !== r.userId
      const since =
        first || !meta.cursor
          ? null
          : new Date(Date.parse(meta.cursor) - CURSOR_OVERLAP_MS).toISOString()
      const pulled = await r.api.pull(since)
      if (pulled.some((c) => c.schemaVersion > SCHEMA_VERSION)) {
        return set({ status: 'newer' })
      }
      if (remote !== r) return // account cambiato nel frattempo
      if (first) await local.startAccount(pulled.length > 0)
      await local.applyRemote(pulled)

      const pending = await local.pendingChanges()
      for (let i = 0; i < pending.length; i += PUSH_CHUNK) {
        const chunk = pending.slice(i, i + PUSH_CHUNK)
        await r.api.push(chunk)
        await local.ackChanges(chunk)
      }

      const cursor = pulled.reduce<IsoDateTime | null>(
        (max, c) => (max && max >= c.serverAt ? max : c.serverAt),
        first ? null : (meta?.cursor ?? null),
      )
      const lastSyncAt = now().toISOString()
      if (remote !== r) return
      await local.setSyncMeta({ userId: r.userId, cursor, lastSyncAt })
      set({ status: 'idle', lastSyncAt })
    } catch (error) {
      console.error('Sincronizzazione non riuscita', error)
      set({ status: isOnline() ? 'error' : 'offline' })
    }
  }

  const syncNow = (): Promise<void> => {
    if (running) {
      again = true
      return running
    }
    running = (async () => {
      do {
        again = false
        await runOnce()
      } while (again)
      running = null
    })()
    return running
  }

  return {
    async setRemote(next) {
      remote = next
      if (!next) {
        if (timer) clearTimeout(timer)
        await local.setSyncMeta(null)
        set({ status: 'off', lastSyncAt: null })
        return
      }
      const meta = await local.getSyncMeta()
      set({
        status: 'idle',
        lastSyncAt: meta?.userId === next.userId ? meta.lastSyncAt : null,
      })
    },
    syncNow,
    schedule(delayMs = 3000) {
      if (!remote) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void syncNow()
      }, delayMs)
    },
    getState: () => state,
    subscribe(fn) {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
  }
}
