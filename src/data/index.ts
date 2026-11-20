import { useSyncExternalStore } from 'react'
import { createDexieStore } from './dexieStore'
import type { LegacyStorage } from './legacyLocalStorage'
import type { DataStore, StoreHealth } from './store'
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

/** Stato dell'account e della sincronizzazione, aggiornato in tempo reale. */
export function useAccount(): AccountState {
  return useSyncExternalStore(account.subscribe, account.getState)
}

let revision = 0
const localListeners = new Set<() => void>()
dataStore.subscribe(() => {
  revision += 1
})

/** Fa ricaricare le pagine dopo una scrittura fatta fuori da loro (es. import Garmin). */
export function refreshData(): void {
  revision += 1
  localListeners.forEach((fn) => fn())
}

const subscribeRevision = (fn: () => void) => {
  const off = dataStore.subscribe(fn)
  localListeners.add(fn)
  return () => {
    off()
    localListeners.delete(fn)
  }
}

/** Cambia quando arrivano dati da un altro dispositivo (o con `refreshData`): da mettere nelle dipendenze dei caricamenti. */
export function useDataRevision(): number {
  return useSyncExternalStore(subscribeRevision, () => revision)
}

/** Stato del salvataggio del dispositivo (solo in memoria, salvataggi non riusciti). */
export function useStoreHealth(): StoreHealth {
  return useSyncExternalStore(dataStore.onHealth, dataStore.health)
}

/** Il salvataggio del dispositivo funziona (gli strumenti del server si possono usare). */
export function useStoreOk(): boolean {
  return useStoreHealth().mode === 'ok'
}
