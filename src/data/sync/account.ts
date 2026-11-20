// Account e sincronizzazione nel browser: login con codice via email (Supabase Auth),
// avvio del motore all'avvio, al ritorno online, quando l'app torna visibile e dopo
// ogni salvataggio. Senza chiavi in `.env` la sincronizzazione resta spenta.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createSyncEngine, type SyncState, type SyncStatus } from './engine'
import type { DataStore } from '../store'
import { createFitStorage, type FitCache, type FitUsage } from './fitStorage'
import { createSupabaseRemote } from './supabaseRemote'
import type { SyncLocal } from './types'

/** Con l'app aperta e visibile, controlla le novità ogni tanto. */
const POLL_MS = 5 * 60_000

export interface AccountState extends SyncState {
  /** Chiavi di Supabase configurate (altrimenti niente account). */
  available: boolean
  /** Email dell'account collegato; `null` = non collegato. */
  email: string | null
}

interface Account {
  getState(): AccountState
  subscribe(listener: () => void): () => void
  /** Invia l'email con il codice (e il link) di accesso. */
  sendCode(email: string): Promise<void>
  /** Accede con il codice ricevuto via email. */
  verifyCode(email: string, code: string): Promise<void>
  /** Esce: i dati restano sul dispositivo. */
  signOut(): Promise<void>
  /** Sincronizza adesso; restituisce lo stato finale (`idle` = riuscita). */
  syncNow(): Promise<SyncStatus>
  /**
   * File FIT di un'attività: dalla cache del dispositivo, altrimenti dal
   * server (se collegati); `null` = non disponibile.
   */
  getFitFile(id: string): Promise<Uint8Array | null>
  /** Carica sul server i file FIT nuovi (si fa anche dopo ogni sincronizzazione). */
  uploadFitFiles(): Promise<void>
  /** Spazio dei FIT dell'utente sul server; `null` se non collegati o offline. */
  fitUsage(): Promise<FitUsage | null>
  /** Toglie i FIT dal server e dalla cache (archiviazione). Serve la connessione. */
  archiveFitFiles(ids: string[]): Promise<void>
  /**
   * Dopo `dataStore.resetAll()`: invia subito le cancellazioni e toglie tutti i
   * FIT dal server. Senza account non fa nulla.
   */
  resetServer(): Promise<void>
  /** Svuota le proprie righe sul server e le ricarica da questo dispositivo. */
  rebuildServer(): Promise<void>
}

type Local = SyncLocal &
  FitCache &
  Pick<DataStore, 'deleteFitFiles' | 'requeueAll'>

/** Il salvataggio del dispositivo non funziona: gli strumenti del server sono bloccati. */
export class StoreUnavailableError extends Error {
  constructor() {
    super('Salvataggio del dispositivo non disponibile')
    this.name = 'StoreUnavailableError'
  }
}

/** La sincronizzazione chiesta da uno strumento non è riuscita. */
export class SyncFailedError extends Error {
  readonly status: SyncStatus
  constructor(status: SyncStatus) {
    super(`Sincronizzazione non riuscita (${status})`)
    this.name = 'SyncFailedError'
    this.status = status
  }
}

function makeClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
    string | undefined
  if (!url || !key) return null
  try {
    return createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  } catch (error) {
    console.error('Supabase non configurato correttamente', error)
    return null
  }
}

export function createAccount(local: Local): Account {
  const client = makeClient()
  const online = () =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false
  const engine = createSyncEngine({ local, isOnline: online })
  const listeners = new Set<() => void>()
  let email: string | null = null
  let userId: string | null = null
  let state: AccountState = {
    ...engine.getState(),
    available: client !== null,
    email: null,
  }
  const refresh = () => {
    state = { ...engine.getState(), available: client !== null, email }
    listeners.forEach((fn) => fn())
  }
  engine.subscribe(refresh)
  const files = client ? createFitStorage(client, local) : null
  const uploadFitFiles = async () => {
    if (files && userId && online()) await files.uploadPending(userId)
  }
  let lastStatus = state.status
  engine.subscribe(() => {
    const status = engine.getState().status
    if (status === 'idle' && lastStatus === 'syncing') {
      void uploadFitFiles()
    }
    lastStatus = status
  })

  if (client) {
    const remote = createSupabaseRemote(client)
    client.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      // fuori dal callback: Supabase sconsiglia altre chiamate al suo interno
      setTimeout(() => {
        if ((user?.id ?? null) === userId) {
          if (email !== (user?.email ?? null)) {
            email = user?.email ?? null
            refresh()
          }
          return
        }
        const wasSignedIn = userId !== null
        userId = user?.id ?? null
        email = user?.email ?? null
        if (user) {
          void engine
            .setRemote({ userId: user.id, api: remote })
            .then(() => engine.syncNow())
        } else if (wasSignedIn) {
          void engine.setRemote(null)
        }
        refresh()
      }, 0)
    })

    local.onLocalChange(() => engine.schedule())
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => engine.schedule(500))
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') engine.schedule(500)
      })
      setInterval(() => {
        if (document.visibilityState === 'visible') engine.schedule(0)
      }, POLL_MS)
    }
  }

  const need = () => {
    if (!client) throw new Error('Supabase non configurato')
    return client
  }

  /** Strumenti che cancellano dal server: solo con il salvataggio del dispositivo funzionante. */
  const needStore = async () => {
    await local.init()
    if (local.health().mode !== 'ok') throw new StoreUnavailableError()
  }
  /** Sincronizza e fallisce se non è andata a buon fine. */
  const syncOrThrow = async () => {
    const status = await engine.syncNow()
    if (status !== 'idle') throw new SyncFailedError(status)
  }

  return {
    getState: () => state,
    subscribe(fn) {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    async sendCode(address) {
      const { error } = await need().auth.signInWithOtp({
        email: address,
        options: {
          shouldCreateUser: true,
          emailRedirectTo:
            typeof window === 'undefined' ? undefined : window.location.origin,
        },
      })
      if (error) throw error
    },
    async verifyCode(address, code) {
      const { error } = await need().auth.verifyOtp({
        email: address,
        token: code,
        type: 'email',
      })
      if (error) throw error
    },
    async signOut() {
      const { error } = await need().auth.signOut({ scope: 'local' })
      if (error) throw error
    },
    syncNow: () => engine.syncNow(),
    async getFitFile(id) {
      const cached = await local.getFitFile(id)
      if (cached) return cached
      if (!files || !userId || !online()) return null
      return files.download(userId, id)
    },
    uploadFitFiles,
    async fitUsage() {
      if (!files || !userId || !online()) return null
      return files.usage(userId)
    },
    async archiveFitFiles(ids) {
      if (!files || !userId) throw new Error('Account non collegato')
      if (!online()) throw new Error('Serve la connessione')
      await needStore()
      await files.remove(userId, ids)
      await local.deleteFitFiles(ids)
    },
    async resetServer() {
      if (!files || !userId) return
      if (!online()) throw new Error('Serve la connessione')
      await needStore()
      // i FIT si tolgono solo se le cancellazioni sono arrivate al server
      await syncOrThrow()
      await files.removeAll(userId)
    },
    async rebuildServer() {
      if (!client || !userId) throw new Error('Account non collegato')
      if (!online()) throw new Error('Serve la connessione')
      await needStore()
      const { error } = await client
        .from('items')
        .delete()
        .eq('user_id', userId)
      if (error) throw error
      await local.requeueAll()
      await syncOrThrow()
      await uploadFitFiles()
    },
  }
}
