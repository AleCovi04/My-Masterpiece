// Controlli di forma sui dati letti dal salvataggio, da un file o da un backup.
import { isIsoDate } from '../lib/dates'
import type { RawData } from './migrations'
import type {
  AppData,
  DataCounts,
  Exercise,
  Session,
  WorkoutTemplate,
} from './types'

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object'

const ENDURANCE = new Set(['run', 'bike', 'swim'])

const isSetList = (v: unknown) =>
  Array.isArray(v) &&
  v.every(
    (s) =>
      isObj(s) &&
      (s.reps === undefined || typeof s.reps === 'number') &&
      (s.rir === undefined || typeof s.rir === 'number'),
  )

const isEntryList = (v: unknown) =>
  Array.isArray(v) &&
  v.every(
    (e) =>
      isObj(e) &&
      typeof e.exerciseId === 'string' &&
      typeof e.restSeconds === 'number' &&
      isSetList(e.sets),
  )

const isMode = (v: unknown) => v === 'simple' || v === 'structured'

export function isExercise(v: unknown): v is Exercise {
  return (
    isObj(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    Array.isArray(v.muscles) &&
    typeof v.defaultRestSeconds === 'number'
  )
}

export function isTemplate(v: unknown): v is WorkoutTemplate {
  if (!isObj(v) || typeof v.id !== 'string' || typeof v.name !== 'string') {
    return false
  }
  return v.discipline === 'strength'
    ? isEntryList(v.entries)
    : ENDURANCE.has(v.discipline as string) && isMode(v.mode)
}

export function isSession(v: unknown): v is Session {
  if (!isObj(v) || typeof v.id !== 'string' || !isIsoDate(v.date)) return false
  if (!isObj(v.plan)) return false
  return v.discipline === 'strength'
    ? isEntryList(v.plan.entries)
    : ENDURANCE.has(v.discipline as string) && isMode(v.plan.mode)
}

/** Ha la forma di un insieme di dati (tre elenchi)? Il contenuto si controlla con `sanitize`. */
export function isRawData(v: unknown): v is RawData {
  return (
    isObj(v) &&
    Array.isArray(v.exercises) &&
    Array.isArray(v.templates) &&
    Array.isArray(v.sessions)
  )
}

/** Tiene solo gli elementi validi (e senza id doppi); `dropped` = quanti ne ha scartati. */
export function sanitize(raw: RawData): { data: AppData; dropped: number } {
  let dropped = 0
  const keep = <T extends { id: string }>(
    list: unknown[],
    ok: (v: unknown) => v is T,
  ): T[] => {
    const seen = new Set<string>()
    const out: T[] = []
    for (const v of list) {
      if (ok(v) && !seen.has(v.id)) {
        seen.add(v.id)
        out.push(v)
      } else {
        dropped += 1
      }
    }
    return out
  }
  return {
    data: {
      exercises: keep(raw.exercises, isExercise),
      templates: keep(raw.templates, isTemplate),
      sessions: keep(raw.sessions, isSession),
      raceDate: isIsoDate(raw.raceDate) ? raw.raceDate : null,
    },
    dropped,
  }
}

export const countData = (d: {
  exercises: unknown[]
  templates: unknown[]
  sessions: unknown[]
}): DataCounts => ({
  exercises: d.exercises.length,
  templates: d.templates.length,
  sessions: d.sessions.length,
})
