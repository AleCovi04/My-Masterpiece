// Preferenze del dispositivo (tema, lingua): sempre locali, non vanno sul server.

export function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writePreference(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage non disponibile: la scelta vale solo per questa sessione
  }
}
