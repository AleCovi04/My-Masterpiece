// Controlli di forma sui dati letti dal salvataggio, da un file o da un backup.
import { isIsoDate } from '../lib/dates'
import type { RawData } from './migrations'
import {
  BLOCK_MAX_WEEKS,
  BRICK_MAX_LEGS,
  BRICK_MIN_LEGS,
  DAYS_PER_WEEK,
} from './types'
import type {
  AppData,
  BlockApplication,
  DataCounts,
  Exercise,
  LiveWorkout,
  Phase,
  Session,
  TrainingBlock,
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

/** Frazioni di un brick: 2–6; una seduta vuota (`allowEmpty`) può non averne. */
const isLegList = (v: unknown, allowEmpty = false) =>
  Array.isArray(v) &&
  ((allowEmpty && v.length === 0) ||
    (v.length >= BRICK_MIN_LEGS && v.length <= BRICK_MAX_LEGS)) &&
  v.every(
    (l) =>
      isObj(l) &&
      typeof l.id === 'string' &&
      ENDURANCE.has(l.discipline as string) &&
      isMode(l.mode) &&
      (l.transitionBeforeS === undefined ||
        typeof l.transitionBeforeS === 'number'),
  )

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
  if (v.discipline === 'brick') return isLegList(v.legs)
  return v.discipline === 'strength'
    ? isEntryList(v.entries)
    : ENDURANCE.has(v.discipline as string) && isMode(v.mode)
}

export function isSession(v: unknown): v is Session {
  if (!isObj(v) || typeof v.id !== 'string' || !isIsoDate(v.date)) return false
  if (!isObj(v.plan)) return false
  if (v.discipline === 'brick') return isLegList(v.plan.legs, true)
  return v.discipline === 'strength'
    ? isEntryList(v.plan.entries)
    : ENDURANCE.has(v.discipline as string) && isMode(v.plan.mode)
}

const DISCIPLINES = new Set(['strength', 'run', 'bike', 'swim', 'brick'])

const isBlockItem = (v: unknown) =>
  isObj(v) &&
  typeof v.id === 'string' &&
  ((v.kind === 'template' && typeof v.templateId === 'string') ||
    (v.kind === 'empty' && DISCIPLINES.has(v.discipline as string)))

export function isBlock(v: unknown): v is TrainingBlock {
  return (
    isObj(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    Array.isArray(v.weeks) &&
    v.weeks.length >= 1 &&
    v.weeks.length <= BLOCK_MAX_WEEKS &&
    v.weeks.every(
      (w) =>
        isObj(w) &&
        typeof w.id === 'string' &&
        Array.isArray(w.days) &&
        w.days.length === DAYS_PER_WEEK &&
        w.days.every((d) => Array.isArray(d) && d.every(isBlockItem)),
    )
  )
}

export function isPhase(v: unknown): v is Phase {
  return (
    isObj(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    Array.isArray(v.blockIds) &&
    v.blockIds.every((id) => typeof id === 'string')
  )
}

export function isApplication(v: unknown): v is BlockApplication {
  return (
    isObj(v) &&
    typeof v.id === 'string' &&
    (v.kind === 'block' || v.kind === 'phase') &&
    typeof v.sourceId === 'string' &&
    typeof v.name === 'string' &&
    isIsoDate(v.startDate) &&
    Array.isArray(v.weeks) &&
    v.weeks.every(
      (w) =>
        isObj(w) &&
        isIsoDate(w.start) &&
        typeof w.week === 'number' &&
        typeof w.weeks === 'number',
    )
  )
}

/** Bozza dell'allenamento in corso con la forma attesa (altrimenti si ignora). */
export function isLiveWorkout(v: unknown): v is LiveWorkout {
  return (
    isObj(v) &&
    v.version === 1 &&
    typeof v.sessionId === 'string' &&
    typeof v.startedAt === 'string' &&
    Array.isArray(v.exercises) &&
    v.exercises.every(
      (e) =>
        isObj(e) &&
        typeof e.id === 'string' &&
        typeof e.exerciseId === 'string' &&
        typeof e.restSeconds === 'number' &&
        Array.isArray(e.sets) &&
        e.sets.every(
          (s) =>
            isObj(s) && typeof s.kg === 'string' && typeof s.reps === 'string',
        ),
    )
  )
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
      blocks: keep(raw.blocks ?? [], isBlock),
      phases: keep(raw.phases ?? [], isPhase),
      applications: keep(raw.applications ?? [], isApplication),
      raceDate: isIsoDate(raw.raceDate) ? raw.raceDate : null,
    },
    dropped,
  }
}

export const countData = (d: {
  exercises: unknown[]
  templates: unknown[]
  sessions: unknown[]
  blocks?: unknown[]
  phases?: unknown[]
}): DataCounts => ({
  exercises: d.exercises.length,
  templates: d.templates.length,
  sessions: d.sessions.length,
  blocks: d.blocks?.length ?? 0,
  phases: d.phases?.length ?? 0,
})
