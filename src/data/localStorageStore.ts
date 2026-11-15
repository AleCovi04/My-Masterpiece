import type { DataStore } from './store'
import type { Exercise, IsoDate, Session, WorkoutTemplate } from './types'
import { generateSampleExercises, generateSampleSessions } from './sampleData'
import { isIsoDate } from '../lib/dates'

const SESSIONS_KEY = 'mm.sessions'
const EXERCISES_KEY = 'mm.exercises'
const TEMPLATES_KEY = 'mm.templates'
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

export const localStorageStore: DataStore = {
  async loadSessions() {
    const raw = read(SESSIONS_KEY)
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as Session[]
        }
      } catch {
        // dati corrotti: si rigenerano sotto
      }
    }
    const sample = generateSampleSessions()
    write(SESSIONS_KEY, JSON.stringify(sample))
    return sample
  },
  async saveSessions(sessions) {
    write(SESSIONS_KEY, JSON.stringify(sessions))
  },
  async loadExercises() {
    const raw = read(EXERCISES_KEY)
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed as Exercise[]
      } catch {
        // dati corrotti: si rigenera il catalogo iniziale
      }
    }
    const sample = generateSampleExercises()
    write(EXERCISES_KEY, JSON.stringify(sample))
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
      return Array.isArray(parsed) ? (parsed as WorkoutTemplate[]) : []
    } catch {
      return []
    }
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
