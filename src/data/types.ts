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

// ---------- Discipline ----------

export type Discipline = 'strength' | 'run' | 'bike' | 'swim'

// ---------- Template ----------

/**
 * Serie prevista: solo obiettivi. I kg non si pianificano: si registrano dal
 * vivo (`ActualSet`). Un campo assente = obiettivo non indicato (mai 0).
 */
export interface TemplateSet {
  /** Ripetizioni obiettivo (≥ 1). */
  reps?: number
  /** RIR obiettivo (0–10): solo un'indicazione, non si registra. */
  rir?: number
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
   * Forza: inserita a mano, mai calcolata, obbligatoria nei template.
   * Corsa/bici/nuoto: presente solo se l'utente ha sovrascritto la durata
   * calcolata (altrimenti si calcola).
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

/**
 * Serie eseguita: kg e ripetizioni. Il RIR non si registra (è solo
 * l'indicazione del piano). La serie n corrisponde alla serie n del piano.
 */
export interface ActualSet {
  kg: number
  reps: number
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

/** Piano di forza: stessa struttura del template (voci, serie con reps e RIR obiettivo, superserie). */
export interface StrengthPlan {
  entries: TemplateEntry[]
}

/** Piano endurance: stessa struttura del template (semplice o a passi e blocchi). */
export interface EndurancePlan {
  mode: 'simple' | 'structured'
  simple?: EnduranceSimple
  items?: EnduranceItem[]
}

export type Plan = StrengthPlan | EndurancePlan

interface SessionBase extends Entity {
  date: IsoDate
  order: number // ordine nel giorno, da 0
  status: SessionStatus
  /** Template d'origine; assente nelle sessioni vuote. */
  templateId?: Id
  /** Nome copiato dal template; assente = si mostra la disciplina. */
  name?: string
  notes?: string
  /** Stesso significato del template: forza a mano, endurance solo se sovrascritta. */
  estimatedDurationSec?: number
}

/**
 * `plan` è una copia: modificarlo non tocca il template e modificare il
 * template non cambia le sedute già pianificate. `actual` (l'eseguito) è
 * solo predisposto.
 */
export interface StrengthSession extends SessionBase {
  discipline: 'strength'
  plan: StrengthPlan
  actual?: StrengthActual
}

export interface EnduranceSession extends SessionBase {
  discipline: EnduranceDiscipline
  plan: EndurancePlan
  actual?: EnduranceActual
}

/** Unione discriminata per disciplina. */
export type Session = StrengthSession | EnduranceSession

// ---------- Insieme dei dati (salvataggio, export, backup) ----------

export interface AppData {
  exercises: Exercise[]
  templates: WorkoutTemplate[]
  sessions: Session[]
  /** `null` = "Nel futuro" (data non ancora scelta). */
  raceDate: IsoDate | null
}

export interface DataCounts {
  exercises: number
  templates: number
  sessions: number
}
