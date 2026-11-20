import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createDexieStore } from '../dexieStore'

/** Client di Supabase finto: conta le operazioni che cancellano dal server. */
const server = vi.hoisted(() => ({
  deletedItems: 0,
  storageCalls: 0,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: (
        cb: (event: string, session: { user: object } | null) => void,
      ) => {
        setTimeout(
          () =>
            cb('SIGNED_IN', { user: { id: 'u1', email: 'test@example.com' } }),
          0,
        )
        return { data: { subscription: { unsubscribe() {} } } }
      },
    },
    from: () => ({
      delete: () => ({
        eq: async () => {
          server.deletedItems += 1
          return { error: null }
        },
      }),
      select: () => {
        throw new Error('pull non previsto')
      },
    }),
    storage: {
      from: () => {
        server.storageCalls += 1
        return {
          list: async () => ({ data: [], error: null }),
          remove: async () => ({ error: null }),
        }
      },
    },
    rpc: async () => ({ error: null }),
  }),
}))

const { createAccount, isNotRegistered, StoreUnavailableError } =
  await import('./account')

const ticks = () => new Promise((r) => setTimeout(r, 20))

describe('strumenti del server con il salvataggio non disponibile (B3)', () => {
  beforeAll(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
  })
  afterAll(() => {
    vi.unstubAllEnvs()
  })

  it('in memoria Ricarica il server e Ricomincia da zero vengono rifiutati senza toccare il server', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = createDexieStore({
      idb: { indexedDB: undefined, IDBKeyRange: undefined },
    })
    const account = createAccount(store)
    await ticks()
    expect(account.getState().email).toBe('test@example.com')
    await expect(account.rebuildServer()).rejects.toBeInstanceOf(
      StoreUnavailableError,
    )
    await expect(account.resetServer()).rejects.toBeInstanceOf(
      StoreUnavailableError,
    )
    await expect(account.archiveFitFiles(['a'])).rejects.toBeInstanceOf(
      StoreUnavailableError,
    )
    expect(server.deletedItems).toBe(0)
    expect(server.storageCalls).toBe(0)
    expect(account.getState().status).toBe('paused')
    error.mockRestore()
  })
})

describe('iscrizioni chiuse (B7)', () => {
  it('riconosce gli errori di Supabase per un’email senza account', () => {
    expect(isNotRegistered({ code: 'otp_disabled' })).toBe(true)
    expect(isNotRegistered({ message: 'Signups not allowed for otp' })).toBe(
      true,
    )
    expect(isNotRegistered({ code: 'over_email_send_rate_limit' })).toBe(false)
    expect(isNotRegistered({ message: 'Network error' })).toBe(false)
  })
})
