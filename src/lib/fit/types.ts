// Attività letta da un file FIT (Garmin). Unità: secondi, metri, m/s, bpm,
// watt, °C. La cadenza della corsa è in passi al minuto (entrambe le gambe).
import type { EnduranceDiscipline } from '../../data/types'

/** Messaggi decodificati dall'SDK, raggruppati per tipo (`recordMesgs`, …). */
export type FitMessages = Record<string, Record<string, unknown>[]>

/** Un campione (di solito uno al secondo). `t` = secondi dall'inizio del file. */
export interface FitPoint {
  t: number
  /** Distanza progressiva della frazione. */
  d?: number
  lat?: number
  lon?: number
  alt?: number
  hr?: number
  /** Velocità. */
  v?: number
  cad?: number
  pw?: number
  temp?: number
}

export interface FitLap {
  startS: number
  durationS: number
  elapsedS: number
  distanceM?: number
  avgHr?: number
  maxHr?: number
  avgSpeed?: number
  avgCadence?: number
  avgPowerW?: number
  elevationGainM?: number
}

/** Una vasca del nuoto in piscina. */
export interface FitLength {
  durationS: number
  strokes?: number
  stroke?: string
  /** `false` = pausa a bordo vasca. */
  active: boolean
}

/** Zone salvate dall'orologio: limiti superiori (n−1) e secondi in ogni zona (n). */
export interface FitZones {
  boundaries: number[]
  seconds: number[]
}

/** Una frazione (un'attività semplice ne ha una sola). */
export interface FitSession {
  discipline: EnduranceDiscipline
  /** Es. `treadmill`, `indoorCycling`, `lapSwimming`, `openWater`. */
  subSport?: string
  startedAt: string
  /** Secondi dall'inizio del file. */
  startS: number
  elapsedS: number
  /** Tempo con il cronometro attivo (pause escluse). */
  timerS: number
  movingS?: number
  distanceM?: number
  avgHr?: number
  maxHr?: number
  avgSpeed?: number
  maxSpeed?: number
  ascentM?: number
  descentM?: number
  calories?: number
  avgCadence?: number
  maxCadence?: number
  avgPowerW?: number
  maxPowerW?: number
  normPowerW?: number
  avgTempC?: number
  maxTempC?: number
  trainingEffect?: number
  poolLengthM?: number
  totalStrokes?: number
  avgSwolf?: number
  /** Indici in `FitActivity.points` (fine esclusa). */
  pointStart: number
  pointEnd: number
  laps: FitLap[]
  lengths: FitLength[]
  hrZones?: FitZones
  powerZones?: FitZones
}

export interface FitActivity {
  /** Chiave stabile del file (numero di serie + ora di creazione): evita doppioni. */
  key: string
  startedAt: string
  sessions: FitSession[]
  /** Transizioni di un multisport, in ordine (durata in secondi). */
  transitions: { afterSession: number; durationS: number }[]
  points: FitPoint[]
}
