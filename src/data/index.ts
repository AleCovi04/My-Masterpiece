import { localStorageStore } from './localStorageStore'
import type { DataStore } from './store'

// Punto unico da cambiare quando arriverà Supabase.
export const dataStore: DataStore = localStorageStore
export type { DataStore }
