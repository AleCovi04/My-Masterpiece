// Vecchio salvataggio in localStorage (prima di IndexedDB): si legge una sola
// volta, al primo avvio, e le sue chiavi restano come copia di backup.
import type { RawData } from './migrations'

export type LegacyStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const KEYS = {
  sessions: 'mm.sessions',
  exercises: 'mm.exercises',
  templates: 'mm.templates',
  raceDate: 'mm.raceDate',
  /** Presente = esercizi già passati ai 20 gruppi muscolari (schema v1). */
  muscles20: 'mm.migrations.muscles20',
} as const

/** Dopo la migrazione `mm.sessions` diventa `mm.sessions.backup-idb`, e così le altre. */
const LEGACY_BACKUP_SUFFIX = '.backup-idb'

const DEFAULT_RACE_DATE = '2028-08-20'

interface LegacyData {
  raw: RawData
  /** Versione dello schema dei dati trovati: 0 o 1. */
  version: number
  /** C'era un catalogo esercizi leggibile? */
  hasExercises: boolean
}

function get(storage: LegacyStorage, key: string): string | null {
  try {
    // dopo la migrazione resta solo la copia: serve se IndexedDB viene svuotato
    return storage.getItem(key) ?? storage.getItem(key + LEGACY_BACKUP_SUFFIX)
  } catch {
    return null
  }
}

function list(text: string | null): unknown[] | null {
  if (text === null) return null
  try {
    const v: unknown = JSON.parse(text)
    return Array.isArray(v) ? v : null
  } catch {
    return null
  }
}

/** I dati del vecchio salvataggio, o `null` se non c'è nulla da migrare. */
export function readLegacy(storage: LegacyStorage): LegacyData | null {
  const texts = {
    sessions: get(storage, KEYS.sessions),
    exercises: get(storage, KEYS.exercises),
    templates: get(storage, KEYS.templates),
    raceDate: get(storage, KEYS.raceDate),
  }
  if (Object.values(texts).every((t) => t === null)) return null

  const exercises = list(texts.exercises)
  let raceDate: unknown = DEFAULT_RACE_DATE
  if (texts.raceDate !== null) {
    try {
      raceDate = JSON.parse(texts.raceDate)
    } catch {
      // valore illeggibile: resta la data predefinita
    }
  }
  return {
    raw: {
      exercises: exercises ?? [],
      templates: list(texts.templates) ?? [],
      sessions: list(texts.sessions) ?? [],
      raceDate,
    },
    version: get(storage, KEYS.muscles20) === null ? 0 : 1,
    hasExercises: exercises !== null,
  }
}

/** Rinomina le chiavi vecchie in copie di backup (`<chiave>.backup-idb`). */
export function backupLegacyKeys(storage: LegacyStorage): void {
  for (const key of Object.values(KEYS)) {
    try {
      const value = storage.getItem(key)
      if (value === null) continue
      storage.setItem(key + LEGACY_BACKUP_SUFFIX, value)
      storage.removeItem(key)
    } catch {
      // spazio esaurito o storage bloccato: la chiave originale resta dov'è
    }
  }
}
