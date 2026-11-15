// Dati di esempio: settimana corrente + 11 precedenti, rispettando i tipi.
import type {
  Actual,
  ActualExercise,
  BikePlan,
  Exercise,
  Discipline,
  EnduranceActual,
  Plan,
  RunPlan,
  Session,
  SessionStatus,
  StrengthPlan,
  SwimPlan,
} from './types'
import { DEFAULT_REST_SECONDS } from './types'
import { addDays, mondayOf, toIsoDate } from '../lib/dates'
import { estimateDurationSeconds } from '../lib/endurance'
import { estimateStrengthDurationSeconds } from '../lib/strength'

export const SAMPLE_WEEKS = 12

type SteadyRunPlan = Extract<RunPlan, { mode: 'steady' }>
type SimpleEndurancePlan = SwimPlan | BikePlan | SteadyRunPlan

// [giorno (0 = lunedì), disciplina, ore pianificate, saltata (se già passata), km]
type Slot = [number, Discipline, number, boolean, number]
const WEEK_TEMPLATE: Slot[] = [
  [0, 'swim', 1, false, 2],
  [1, 'run', 0.75, false, 7],
  [1, 'strength', 1, false, 0],
  [2, 'bike', 1.5, false, 40],
  [3, 'swim', 1, true, 2.2],
  [3, 'strength', 1, false, 0],
  [4, 'run', 0.75, false, 7],
  [5, 'bike', 2.5, false, 65],
  [6, 'run', 1.25, false, 12],
]

const EXERCISES = [
  { id: 'sample-panca', kg: 60, reps: 8 },
  { id: 'sample-lat-machine', kg: 55, reps: 10 },
  { id: 'sample-leg-press', kg: 120, reps: 12 },
  { id: 'sample-rematore', kg: 50, reps: 10 },
]

/** Generatore pseudo-casuale deterministico (mulberry32). */
function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function strengthPlan(scale: number): StrengthPlan {
  return {
    discipline: 'strength',
    exercises: EXERCISES.map((e) => ({
      exerciseId: e.id,
      restSeconds: DEFAULT_REST_SECONDS,
      sets: Array.from({ length: 4 }, () => ({
        reps: e.reps,
        kg: Math.round((e.kg * scale) / 2.5) * 2.5,
        targetRir: 2,
      })),
    })),
  }
}

function endurancePlan(
  discipline: Exclude<Discipline, 'strength'>,
  hours: number,
  km: number,
): SimpleEndurancePlan {
  const sec = hours * 3600
  if (discipline === 'swim') {
    const distanceM = Math.max(100, Math.round((km * 1000) / 50) * 50)
    return {
      discipline,
      distanceM,
      paceSecPer100m: Math.round(sec / (distanceM / 100)),
    }
  }
  if (discipline === 'bike') {
    return {
      discipline,
      distanceM: km * 1000,
      avgSpeedKmh: Math.round((km / hours) * 10) / 10,
    }
  }
  return {
    discipline,
    mode: 'steady',
    distanceM: km * 1000,
    paceSecPerKm: Math.round(sec / km),
  }
}

function enduranceActual(
  plan: SimpleEndurancePlan,
  durationS: number,
): EnduranceActual {
  const km = plan.distanceM / 1000
  const base = {
    source: 'manual' as const,
    distanceM: plan.distanceM,
    durationS,
    laps: [],
  }
  switch (plan.discipline) {
    case 'run':
      return {
        ...base,
        discipline: 'run',
        avgPaceSecPerKm: Math.round(durationS / km),
      }
    case 'bike':
      return {
        ...base,
        discipline: 'bike',
        avgSpeedKmh: Math.round((km / (durationS / 3600)) * 10) / 10,
      }
    case 'swim':
      return {
        ...base,
        discipline: 'swim',
        avgPaceSecPer100m: Math.round(durationS / (plan.distanceM / 100)),
      }
  }
}

function strengthActual(
  plan: StrengthPlan,
  start: Date,
  durationS: number,
): Actual {
  const totalSets = plan.exercises.reduce((n, e) => n + e.sets.length, 0)
  let i = 0
  const exercises: ActualExercise[] = plan.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    skipped: false,
    sets: e.sets.map((s) => {
      i += 1
      return {
        kg: s.kg,
        reps: s.reps,
        rir: s.targetRir,
        completedAt: new Date(
          start.getTime() + ((durationS * 1000) / totalSets) * i,
        ).toISOString(),
      }
    }),
  }))
  return {
    discipline: 'strength',
    startedAt: start.toISOString(),
    endedAt: new Date(start.getTime() + durationS * 1000).toISOString(),
    exercises,
  }
}

export function generateSampleSessions(now: Date = new Date()): Session[] {
  const today = toIsoDate(now)
  const thisMonday = mondayOf(now)
  const todayOffset = (now.getDay() + 6) % 7
  const stamp = now.toISOString()
  const sessions: Session[] = []

  for (let w = 0; w < SAMPLE_WEEKS; w++) {
    const monday = addDays(thisMonday, -7 * w)
    const rand = rng(1000 + w)
    // settimane più lontane = un po' meno volume, con variazione
    const scale = Math.max(
      0.5,
      0.65 + 0.035 * (SAMPLE_WEEKS - 1 - w) + (rand() - 0.5) * 0.16,
    )
    let slots: Slot[] = WEEK_TEMPLATE
    if (w === 0) {
      // oggi: un nuoto completato e una corsa ancora da fare
      slots = [
        ...WEEK_TEMPLATE.filter((s) => s[0] !== todayOffset),
        [todayOffset, 'swim', 1, false, 2],
        [todayOffset, 'run', 0.75, false, 7],
      ]
    }
    const perDay: Record<number, number> = {}
    for (const [day, discipline, hours, skip, km] of slots) {
      const dayDate = addDays(monday, day)
      const date = toIsoDate(dayDate)
      const order = (perDay[day] = (perDay[day] ?? -1) + 1)
      const h = Math.max(0.25, Math.round(hours * scale * 4) / 4)
      const plan: Plan =
        discipline === 'strength'
          ? strengthPlan(0.8 + scale * 0.2)
          : endurancePlan(discipline, h, Math.round(km * scale * 10) / 10)

      let status: SessionStatus = 'planned'
      if (date < today) {
        status = (w === 0 ? skip : rand() < 0.08) ? 'skipped' : 'done'
      } else if (date === today && discipline === 'swim') {
        status = 'done'
      }

      const planned =
        plan.discipline === 'strength'
          ? estimateStrengthDurationSeconds(plan)
          : estimateDurationSeconds(plan)
      const durationS = Math.round(planned * (0.92 + rand() * 0.14))
      const start = new Date(dayDate)
      start.setHours(order === 0 ? 7 : 18, 30, 0, 0)

      let actual: Actual | undefined
      if (status === 'done') {
        actual =
          plan.discipline === 'strength'
            ? strengthActual(plan, start, durationS)
            : enduranceActual(plan as SimpleEndurancePlan, durationS)
      }

      sessions.push({
        id: `sample-${date}-${order}`,
        createdAt: stamp,
        updatedAt: stamp,
        date,
        order,
        status,
        plan,
        ...(actual && { actual }),
      })
    }
  }
  return sessions
}

/** Catalogo iniziale: gli esercizi citati dalle sedute di esempio. */
export function generateSampleExercises(now: Date = new Date()): Exercise[] {
  const stamp = now.toISOString()
  const defs: [string, string, Exercise['muscles']][] = [
    [
      'sample-panca',
      'Panca piana',
      [
        { muscle: 'chest', percent: 100 },
        { muscle: 'front_delts', percent: 60 },
        { muscle: 'triceps', percent: 40 },
      ],
    ],
    [
      'sample-lat-machine',
      'Lat machine',
      [
        { muscle: 'lats', percent: 100 },
        { muscle: 'biceps', percent: 50 },
        { muscle: 'rear_delts', percent: 30 },
      ],
    ],
    [
      'sample-leg-press',
      'Leg press',
      [
        { muscle: 'quads', percent: 100 },
        { muscle: 'glutes', percent: 60 },
        { muscle: 'hamstrings', percent: 30 },
      ],
    ],
    [
      'sample-rematore',
      'Rematore',
      [
        { muscle: 'mid_back', percent: 100 },
        { muscle: 'lats', percent: 70 },
        { muscle: 'biceps', percent: 40 },
      ],
    ],
  ]
  return defs.map(([id, name, muscles]) => ({
    id,
    name,
    muscles,
    defaultRestSeconds: DEFAULT_REST_SECONDS,
    archived: false,
    createdAt: stamp,
    updatedAt: stamp,
  }))
}
