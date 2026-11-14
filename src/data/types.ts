// Modello dati. Unità: tempi in secondi, distanze in metri, pesi in kg,
// date ISO "YYYY-MM-DD", timestamp ISO 8601 completi. Vedi docs/modello-dati.md.

export type Id = string
export type IsoDate = string // YYYY-MM-DD
export type IsoDateTime = string // 2026-11-14T10:30:00.000Z

export interface Entity {
  id: Id
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

// ---------- Muscoli ----------

export const MUSCLES = [
  { id: 'chest', it: 'Petto', en: 'Chest' },
  { id: 'front_delts', it: 'Deltoidi anteriori', en: 'Front delts' },
  { id: 'side_delts', it: 'Deltoidi laterali', en: 'Side delts' },
  { id: 'rear_delts', it: 'Deltoidi posteriori', en: 'Rear delts' },
  { id: 'biceps', it: 'Bicipiti', en: 'Biceps' },
  { id: 'triceps', it: 'Tricipiti', en: 'Triceps' },
  { id: 'forearms', it: 'Avambracci', en: 'Forearms' },
  { id: 'abs', it: 'Addominali', en: 'Abs' },
  { id: 'lats', it: 'Dorsali', en: 'Lats' },
  {
    id: 'mid_back',
    it: 'Schiena media (trapezio/romboidi)',
    en: 'Mid back (traps/rhomboids)',
  },
  { id: 'lower_back', it: 'Lombari', en: 'Lower back' },
  { id: 'glutes', it: 'Glutei', en: 'Glutes' },
  { id: 'quads', it: 'Quadricipiti', en: 'Quads' },
  { id: 'hamstrings', it: 'Femorali', en: 'Hamstrings' },
  { id: 'calves', it: 'Polpacci', en: 'Calves' },
] as const

export type MuscleId = (typeof MUSCLES)[number]['id']

// ---------- Esercizi (solo forza) ----------

export const DEFAULT_REST_SECONDS = 165 // 2:45

export interface MuscleInvolvement {
  muscle: MuscleId
  percent: number // 1–100
}

export interface Exercise extends Entity {
  name: string
  muscles: MuscleInvolvement[]
  defaultRestSeconds: number
  notes?: string
  archived: boolean // mai cancellato, solo archiviato
}

// ---------- Piani (contenuto di un template / copia in una seduta) ----------

export type Discipline = 'strength' | 'run' | 'bike' | 'swim'

export interface PlannedSet {
  reps: number
  kg: number
  targetRir: number
}

export interface PlannedExercise {
  exerciseId: Id
  sets: PlannedSet[]
  restSeconds: number // default: quello dell'esercizio
}

export interface StrengthPlan {
  discipline: 'strength'
  exercises: PlannedExercise[]
}

export interface RunInterval {
  distanceM: number
  paceSecPerKm: number
  walkRestSeconds: number
}

export type RunPlan =
  | {
      discipline: 'run'
      mode: 'steady'
      distanceM: number
      paceSecPerKm: number
    }
  | { discipline: 'run'; mode: 'intervals'; intervals: RunInterval[] }

export interface BikePlan {
  discipline: 'bike'
  distanceM: number
  avgSpeedKmh: number
}

export interface SwimPlan {
  discipline: 'swim'
  distanceM: number
  paceSecPer100m: number
}

export type EndurancePlan = RunPlan | BikePlan | SwimPlan
export type Plan = StrengthPlan | EndurancePlan

// ---------- Template ----------

export interface WorkoutTemplate extends Entity {
  name: string
  plan: Plan
}

// ---------- Esecuzione effettiva ----------

export interface ActualSet {
  kg: number
  reps: number
  rir: number
  completedAt: IsoDateTime
}

export interface ActualExercise {
  exerciseId: Id
  skipped: boolean
  sets: ActualSet[]
}

export interface StrengthActual {
  discipline: 'strength'
  startedAt: IsoDateTime
  endedAt?: IsoDateTime
  exercises: ActualExercise[] // ordine effettivo
}

export interface Lap {
  distanceM: number
  durationS: number
  avgHr?: number
}

export type EnduranceSource = 'manual' | 'garmin_fit'

export interface EnduranceActual {
  discipline: 'run' | 'bike' | 'swim'
  source: EnduranceSource
  distanceM: number
  durationS: number
  avgPaceSecPerKm?: number // corsa
  avgSpeedKmh?: number // bici
  avgPaceSecPer100m?: number // nuoto
  avgHr?: number
  maxHr?: number
  elevationGainM?: number
  laps: Lap[]
}

export type Actual = StrengthActual | EnduranceActual

// ---------- Seduta ----------

export type SessionStatus = 'planned' | 'in_progress' | 'done' | 'skipped'

export interface Session extends Entity {
  date: IsoDate
  order: number // ordine nel giorno, da 0
  status: SessionStatus
  templateId?: Id
  plan: Plan // copia: modificare il template non tocca le sedute
  actual?: Actual
}
