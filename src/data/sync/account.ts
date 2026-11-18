// Account e sincronizzazione nel browser: login con codice via email (Supabase Auth),
// avvio del motore all'avvio, al ritorno online, quando l'app torna visibile e dopo
// ogni salvataggio. Senza chiavi in `.env` la sincronizzazione resta spenta.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createSyncEngine, type SyncState } from './engine'
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

export interface Account {
  getState(): AccountState
  subscribe(listener: () => void): () => void
  /** Invia l'email con il codice (e il link) di accesso. */
  sendCode(email: string): Promise<void>
  /** Accede con il codice ricevuto via email. */
  verifyCode(email: string, code: string): Promise<void>
  /** Esce: i dati restano sul dispositivo. */
  signOut(): Promise<void>
  syncNow(): Promise<void>
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

export function createAccount(local: SyncLocal): Account {
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
  }
}
