import { useSyncExternalStore } from 'react'
import { createDexieStore } from './dexieStore'
import type { LegacyStorage } from './legacyLocalStorage'
import type { DataStore } from './store'
import { createAccount, type AccountState } from './sync/account'

function legacyStorage(): LegacyStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null // accesso allo storage bloccato dal browser
  }
}

const store = createDexieStore({ legacy: legacyStorage() })

/** Unico punto di accesso ai dati. */
export const dataStore: DataStore = store
/** Account e sincronizzazione con Supabase. */
export const account = createAccount(store)
export type { DataStore, AccountState }

/** Stato dell'account e della sincronizzazione, aggiornato in tempo reale. */
export function useAccount(): AccountState {
  return useSyncExternalStore(account.subscribe, account.getState)
}

let revision = 0
dataStore.subscribe(() => {
  revision += 1
})

/** Cambia quando arrivano dati da un altro dispositivo: da mettere nelle dipendenze dei caricamenti. */
export function useDataRevision(): number {
  return useSyncExternalStore(dataStore.subscribe, () => revision)
}
