import type { DataStore } from './store'
import type { Exercise, IsoDate, Session, WorkoutTemplate } from './types'
import { generateSampleExercises } from './sampleData'
import { isIsoDate } from '../lib/dates'
import { migrateExercise } from '../lib/muscleMigration'

const SESSIONS_KEY = 'mm.sessions'
const SESSIONS_BACKUP_KEY = 'mm.sessions.backup-v1'
const EXERCISES_KEY = 'mm.exercises'
const TEMPLATES_KEY = 'mm.templates'
const MIGRATIONS_KEY = 'mm.migrations.muscles20'
const EXERCISES_BACKUP_KEY = 'mm.exercises.backup-v1'
const RACE_KEY = 'mm.raceDate'
const DEFAULT_RACE_DATE: IsoDate = '2028-08-20'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // spazio esaurito o storage bloccato: i dati restano solo in memoria
  }
}

/** Passa ai 20 gruppi muscolari una sola volta, tenendo una copia dei dati originali. */
function migrateOnce(exercises: Exercise[], raw: string): Exercise[] {
  if (read(MIGRATIONS_KEY)) return exercises
  const migrated = exercises.map(migrateExercise)
  write(EXERCISES_BACKUP_KEY, raw)
  write(EXERCISES_KEY, JSON.stringify(migrated))
  write(MIGRATIONS_KEY, new Date().toISOString())
  return migrated
}

const DISCIPLINE_SET = new Set(['strength', 'run', 'bike', 'swim'])

/** Seduta nel formato attuale (piano con la stessa struttura dei template). */
function isSession(v: unknown): v is Session {
  if (!v || typeof v !== 'object') return false
  const s = v as Partial<Session> & { plan?: Record<string, unknown> }
  if (typeof s.id !== 'string' || !isIsoDate(s.date) || !s.plan) return false
  if (typeof s.discipline !== 'string' || !DISCIPLINE_SET.has(s.discipline)) {
    return false
  }
  return s.discipline === 'strength'
    ? Array.isArray(s.plan.entries)
    : s.plan.mode === 'simple' || s.plan.mode === 'structured'
}

export const localStorageStore: DataStore = {
  async loadSessions() {
    const raw = read(SESSIONS_KEY)
    if (!raw) return []
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      const valid = (parsed as unknown[]).filter(isSession)
      if (valid.length !== parsed.length) {
        // formato precedente (dati dimostrativi): copia di sicurezza, poi restano solo le sedute valide
        if (!read(SESSIONS_BACKUP_KEY)) write(SESSIONS_BACKUP_KEY, raw)
        write(SESSIONS_KEY, JSON.stringify(valid))
      }
      return valid
    } catch {
      return []
    }
  },
  async saveSessions(sessions) {
    write(SESSIONS_KEY, JSON.stringify(sessions))
  },
  async loadExercises() {
    const raw = read(EXERCISES_KEY)
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) return migrateOnce(parsed as Exercise[], raw)
      } catch {
        // dati corrotti: si rigenera il catalogo iniziale
      }
    }
    const sample = generateSampleExercises()
    write(EXERCISES_KEY, JSON.stringify(sample))
    write(MIGRATIONS_KEY, new Date().toISOString())
    return sample
  },
  async saveExercises(exercises) {
    write(EXERCISES_KEY, JSON.stringify(exercises))
  },
  async loadTemplates() {
    const raw = read(TEMPLATES_KEY)
    if (!raw) return []
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      // scarta voci di formati precedenti o corrotte
      return (parsed as WorkoutTemplate[]).filter(
        (t) =>
          t &&
          typeof t.name === 'string' &&
          (t.discipline === 'strength'
            ? Array.isArray(t.entries)
            : (t.discipline === 'run' ||
                t.discipline === 'bike' ||
                t.discipline === 'swim') &&
              (t.mode === 'simple' || t.mode === 'structured')),
      )
    } catch {
      return []
    }
  },
  async saveTemplates(templates) {
    write(TEMPLATES_KEY, JSON.stringify(templates))
  },
  async loadRaceDate() {
    const raw = read(RACE_KEY)
    if (raw === null) return DEFAULT_RACE_DATE
    try {
      const v: unknown = JSON.parse(raw)
      return isIsoDate(v) ? v : null
    } catch {
      return DEFAULT_RACE_DATE
    }
  },
  async saveRaceDate(date) {
    write(RACE_KEY, JSON.stringify(date))
  },
}
