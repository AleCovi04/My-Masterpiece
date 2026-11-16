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

// Unica fonte: i 20 gruppi della mappa del corpo.
export { BODY_GROUPS as MUSCLES } from '../components/body/groups'
import type { BodyGroup as MuscleId } from '../components/body/groups'
export type { MuscleId }

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

export interface TemplateSet {
  reps: number
  kg: number
  rir: number
}

/** Una voce del template di forza: un esercizio con le sue serie. */
export interface TemplateEntry {
  exerciseId: Id
  /** Recupero in secondi; in una superserie vale quello dell'ultimo esercizio del giro. */
  restSeconds: number
  notes?: string
  /** Voci consecutive con lo stesso id formano una superserie. */
  supersetId?: string
  sets: TemplateSet[]
}

interface TemplateBase extends Entity {
  name: string
  notes?: string
  /**
   * Forza: inserita a mano, mai calcolata. Corsa/bici/nuoto: presente solo se
   * l'utente ha sovrascritto la durata calcolata (altrimenti si calcola).
   */
  estimatedDurationSec?: number
  archived: boolean // mai cancellato in massa: si archivia
}

export interface StrengthTemplate extends TemplateBase {
  discipline: 'strength'
  entries: TemplateEntry[]
}

// ---------- Template endurance (corsa, bici, nuoto) ----------

export type EnduranceDiscipline = 'run' | 'bike' | 'swim'

/**
 * Intensità: corsa = passo in s/km, nuoto = passo in s/100 m,
 * bici = velocità in km/h. Sempre facoltativa.
 */
export type Intensity = number

export type StepType = 'warmup' | 'work' | 'recovery' | 'cooldown'

/** Un passo: dura una distanza (m) **oppure** un tempo (s), mai entrambi. */
export interface EnduranceStep {
  kind: 'step'
  id: string
  type: StepType
  distanceM?: number
  durationS?: number
  intensity?: Intensity
  notes?: string
}

/** "Ripeti N volte": contiene più passi (mai altri blocchi). */
export interface RepeatBlock {
  kind: 'repeat'
  id: string
  times: number // 2–99
  steps: EnduranceStep[]
}

export type EnduranceItem = EnduranceStep | RepeatBlock

/** Modalità semplice: un solo obiettivo, a distanza o a tempo. */
export interface EnduranceSimple {
  goal: 'distance' | 'time'
  distanceM?: number
  durationS?: number
  intensity?: Intensity
}

interface EnduranceTemplateBase extends TemplateBase {
  mode: 'simple' | 'structured'
  /** Presente se `mode` è `simple`. */
  simple?: EnduranceSimple
  /** Presente se `mode` è `structured`: passi e blocchi in ordine. */
  items?: EnduranceItem[]
}

export interface RunTemplate extends EnduranceTemplateBase {
  discipline: 'run'
}
export interface BikeTemplate extends EnduranceTemplateBase {
  discipline: 'bike'
}
export interface SwimTemplate extends EnduranceTemplateBase {
  discipline: 'swim'
}
export type EnduranceTemplate = RunTemplate | BikeTemplate | SwimTemplate

/** Unione discriminata per disciplina. */
export type WorkoutTemplate = StrengthTemplate | EnduranceTemplate

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
