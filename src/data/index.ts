import { createDexieStore } from './dexieStore'
import type { LegacyStorage } from './legacyLocalStorage'
import type { DataStore } from './store'

function legacyStorage(): LegacyStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null // accesso allo storage bloccato dal browser
  }
}

// Punto unico da cambiare quando arriverà Supabase.
export const dataStore: DataStore = createDexieStore({
  legacy: legacyStorage(),
})
export type { DataStore }
