// Modello dati. Unità: tempi in secondi, distanze in metri, pesi in kg,
// date ISO "YYYY-MM-DD", timestamp ISO 8601 completi. Vedi docs/modello-dati.md.

export type Id = string
export type IsoDate = string // YYYY-MM-DD
export type IsoDateTime = string // 2026-11-14T10:30:00.000Z

interface Entity {
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

/** Uno sport singolo (forza, corsa, bici, nuoto). */
export type Sport = 'strength' | 'run' | 'bike' | 'swim'

/** Tipo di allenamento: uno sport oppure un brick (più frazioni endurance di fila). */
export type Discipline = Sport | 'brick'

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

// ---------- Brick (più frazioni endurance di fila) ----------

export const BRICK_MIN_LEGS = 2
export const BRICK_MAX_LEGS = 6

/**
 * Una frazione del brick: uno sport endurance con il suo piano (stessa
 * struttura dei template di corsa/bici/nuoto) e la transizione facoltativa
 * che la precede (mai sulla prima frazione).
 */
export interface BrickLeg {
  id: string
  discipline: EnduranceDiscipline
  mode: 'simple' | 'structured'
  simple?: EnduranceSimple
  items?: EnduranceItem[]
  /** Transizione prima di questa frazione, in secondi (T1, T2…). */
  transitionBeforeS?: number
}

export interface BrickTemplate extends TemplateBase {
  discipline: 'brick'
  /** Da 2 a 6 frazioni, in ordine. */
  legs: BrickLeg[]
}

/** Unione discriminata per disciplina. */
export type WorkoutTemplate =
  StrengthTemplate | EnduranceTemplate | BrickTemplate

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
  /** Note scritte nel riepilogo finale. */
  notes?: string
  /** Fatica percepita 1–10, dal riepilogo finale (schema v7). */
  rpe?: number
}

/** Giro (dall'import Garmin). */
export interface Lap {
  distanceM: number
  durationS: number
  avgHr?: number
  maxHr?: number
  /** m/s */
  avgSpeed?: number
  avgCadence?: number
  avgPowerW?: number
  elevationGainM?: number
}

export type EnduranceSource = 'manual' | 'garmin_fit'

/**
 * Dati eseguiti di una disciplina endurance (seduta singola o frazione di un
 * brick). Passo e velocità medi non si salvano: si calcolano da distanza e tempo.
 */
export interface EnduranceMetrics {
  /** Tempo di attività in secondi (obbligatorio). */
  durationS: number
  distanceM?: number
  avgHr?: number
  maxHr?: number
  /** Dislivello positivo in metri (solo corsa e bici). */
  elevationGainM?: number
  // --- solo dall'import Garmin (schema v10) ---
  /** Tempo totale, pause comprese. */
  elapsedS?: number
  movingS?: number
  calories?: number
  /** Passi al minuto (corsa), giri al minuto (bici), bracciate al minuto (nuoto). */
  avgCadence?: number
  maxCadence?: number
  avgPowerW?: number
  maxPowerW?: number
  normPowerW?: number
  /** m/s */
  maxSpeed?: number
  avgTempC?: number
  totalStrokes?: number
  poolLengthM?: number
  avgSwolf?: number
}

/** Attività Garmin da cui viene l'eseguito (schema v10). */
export interface GarminRef {
  /** Chiave del file FIT (numero di serie + ora): è anche l'id di `ImportRecord`. */
  activityId: string
  /** Inizio dell'attività. */
  startedAt: IsoDateTime
  /** Il FIT ha la traccia GPS. */
  hasTrack: boolean
}

export interface EnduranceActual extends EnduranceMetrics {
  discipline: EnduranceDiscipline
  source: EnduranceSource
  /** Fatica percepita 1–10. */
  rpe?: number
  notes?: string
  /** Vuoto per l'inserimento manuale. */
  laps: Lap[]
  /** Presente se importato da Garmin. */
  garmin?: GarminRef
}

/** Una frazione eseguita: lo sport è copiato, così l'eseguito resta leggibile anche se il piano cambia. */
export interface BrickLegActual extends EnduranceMetrics {
  /** Frazione del piano (`BrickLeg.id`). */
  legId: string
  discipline: EnduranceDiscipline
  /** Transizione reale prima della frazione, in secondi (mai sulla prima). */
  transitionBeforeS?: number
}

export interface BrickActual {
  discipline: 'brick'
  source: EnduranceSource
  legs: BrickLegActual[]
  rpe?: number
  notes?: string
  /** Presente se importato da Garmin (un FIT multisport). */
  garmin?: GarminRef
}

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

/** Piano brick: le frazioni in ordine, come nel template. */
export interface BrickPlan {
  legs: BrickLeg[]
}

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
  /** Creata applicando un blocco o una fase (`BlockApplication.id`). */
  applicationId?: Id
}

/**
 * `plan` è una copia: modificarlo non tocca il template e modificare il
 * template non cambia le sedute già pianificate. `actual` è l'eseguito
 * (forza: scritto dalla registrazione dal vivo).
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

export interface BrickSession extends SessionBase {
  discipline: 'brick'
  plan: BrickPlan
  actual?: BrickActual
}

/** Unione discriminata per disciplina. */
export type Session = StrengthSession | EnduranceSession | BrickSession

// ---------- Allenamento di forza in corso (bozza della registrazione dal vivo) ----------

/**
 * Stato della schermata live, salvato a ogni azione (`DataStore.saveLiveWorkout`)
 * per riprendere dopo una chiusura. Non fa parte di `AppData`: alla fine diventa
 * lo `StrengthActual` della seduta, con le sole serie completate.
 */
export interface LiveSet {
  id: string
  targetReps?: number
  targetRir?: number
  /** Testo digitato; vuoto = si usa il valore in grigio. */
  kg: string
  reps: string
  /** Presente se la serie è completata (✓). */
  done?: ActualSet
}

export interface LiveExercise {
  id: string
  exerciseId: Id
  restSeconds: number
  supersetId?: string
  notes?: string
  skipped: boolean
  sets: LiveSet[]
}

export interface LiveRest {
  /** Fine del recupero (ms da epoch): il conto alla rovescia si ricalcola da qui. */
  endsAt: number
  totalS: number
}

export interface LiveWorkout {
  version: 1
  sessionId: Id
  startedAt: IsoDateTime
  exercises: LiveExercise[]
  /** Serie corrente (esercizio per id, serie per indice); `null` = tutto completato. */
  focus: { exercise: string; set: number } | null
  rest: LiveRest | null
}

// ---------- Blocchi e fasi (periodizzazione) ----------

export const BLOCK_MAX_WEEKS = 12
export const DAYS_PER_WEEK = 7

/** Un allenamento in un giorno del blocco: collegato a un template, oppure sessione vuota. */
export type BlockItem =
  | { id: string; kind: 'template'; templateId: Id }
  | { id: string; kind: 'empty'; discipline: Discipline }

/** Settimana tipo: 7 giorni (lunedì … domenica), ognuno con 0 o più allenamenti in ordine. */
export interface BlockWeek {
  id: string
  days: BlockItem[][]
}

export interface TrainingBlock extends Entity {
  name: string
  notes?: string
  /** Da 1 a 12 settimane. */
  weeks: BlockWeek[]
  archived: boolean
}

/** Sequenza ordinata di blocchi (anche ripetuti), es. "Base" = carico ×3 + scarico. */
export interface Phase extends Entity {
  name: string
  goal?: string
  blockIds: Id[]
  archived: boolean
}

/** Una settimana del calendario coperta da un'applicazione (per l'etichetta). */
export interface AppliedWeek {
  /** Lunedì della settimana. */
  start: IsoDate
  blockId: Id
  /** Nome del blocco al momento dell'applicazione. */
  blockName: string
  /** Settimana del blocco, da 1. */
  week: number
  /** Settimane del blocco. */
  weeks: number
}

/** Un blocco o una fase applicati al calendario da un lunedì. */
export interface BlockApplication extends Entity {
  kind: 'block' | 'phase'
  sourceId: Id
  /** Nome del blocco o della fase al momento dell'applicazione. */
  name: string
  startDate: IsoDate
  weeks: AppliedWeek[]
}

// ---------- Impostazioni (schema v9) ----------

/** Fascia di serie pesate a settimana (minimo e massimo compresi). */
export interface SetRange {
  min: number
  max: number
}

const DEFAULT_MUSCLE_VOLUME: SetRange = { min: 10, max: 20 }

/** Impostazioni dell'utente, valide su ogni dispositivo. */
export interface Settings {
  /** Fascia di volume settimanale per muscolo (mappa Volume dell'Analisi). */
  muscleVolume: {
    /** Fascia globale. */
    default: SetRange
    /** Eccezioni per singolo muscolo. */
    muscles: Partial<Record<MuscleId, SetRange>>
  }
  /** Zone di FC e potenza delle attività Garmin (schema v10). */
  thresholds: Thresholds
  /**
   * Obiettivo mostrato come "Road to …" (es. "70.3"); assente = non impostato.
   * Campo facoltativo senza nuova versione dello schema.
   */
  goal?: string
}

/** Lunghezza massima dell'obiettivo. */
export const GOAL_MAX = 40

/** Soglie per le zone (FC in bpm, FTP in watt); assenti = non impostate. */
export interface Thresholds {
  maxHr?: number
  restHr?: number
  ftp?: number
}

export const defaultSettings = (): Settings => ({
  muscleVolume: { default: { ...DEFAULT_MUSCLE_VOLUME }, muscles: {} },
  thresholds: {},
})

// ---------- Attività importate (schema v10) ----------

/**
 * Un'attività Garmin già importata (`id` = chiave del FIT): non si importa
 * una seconda volta, nemmeno se la seduta è stata cancellata.
 */
export interface ImportRecord extends Entity {
  source: 'file' | 'intervals'
  /** Id dell'attività su intervals.icu, se viene da lì. */
  intervalsId?: string
  startedAt: IsoDateTime
  /** Seduta in cui è finita (può non esistere più). */
  sessionId?: Id
  /**
   * Attività di intervals.icu da non collegare mai (✕ nella finestra
   * "Collega"): `id` = `icu-<intervalsId>`, senza seduta. Campo facoltativo
   * aggiunto senza cambiare versione (le versioni precedenti la vedono come
   * già importata).
   */
  ignored?: true
  /** File FIT tolto dal server e dalla cache per liberare spazio (resta il riepilogo nella seduta). */
  archived?: true
}

// ---------- Insieme dei dati (salvataggio, export, backup) ----------

export interface AppData {
  exercises: Exercise[]
  templates: WorkoutTemplate[]
  sessions: Session[]
  blocks: TrainingBlock[]
  phases: Phase[]
  applications: BlockApplication[]
  /** `null` = "Nel futuro" (data non ancora scelta). */
  raceDate: IsoDate | null
  settings: Settings
  /** Attività Garmin importate (schema v10). */
  imports: ImportRecord[]
}

export interface DataCounts {
  exercises: number
  templates: number
  sessions: number
  blocks: number
  phases: number
}
