// Volume settimanale per muscolo (mappa "Volume" dell'Analisi). Funzioni pure.
//
// Serie pesate medie a settimana nel periodo: Σ serie × % / 100, diviso il
// numero di settimane del periodo (fino a oggi). Confronto con una fascia
// (di default 10–20 serie a settimana), globale o del singolo muscolo.
import type {
  Exercise,
  IsoDate,
  MuscleId,
  Session,
  SetRange,
  Settings,
} from '../data/types'
import { MUSCLES } from '../data/types'
import { daysBetween } from './dates'
import { muscleSetsIn } from './strength'

export type VolumeZone = 'below' | 'in' | 'above'

/** Settimane del periodo (giorni / 7, almeno 1), contando solo fino a oggi. */
export function weeksIn(
  range: { start: IsoDate; end: IsoDate },
  today: IsoDate,
): number {
  const end = range.end < today ? range.end : today
  const days = daysBetween(range.start, end) + 1
  return Math.max(1, days / 7)
}

/** Serie pesate medie a settimana per muscolo. */
export function weeklyMuscleSets(
  sessions: Session[],
  exercises: Pick<Exercise, 'id' | 'muscles'>[],
  weeks: number,
): Record<MuscleId, number> {
  const total = muscleSetsIn(sessions, exercises)
  const w = Math.max(1, weeks)
  return Object.fromEntries(
    MUSCLES.map((m) => [m.id, total[m.id] / w]),
  ) as Record<MuscleId, number>
}

/** Fascia di un muscolo: la sua, se impostata, altrimenti quella globale. */
export const rangeFor = (settings: Settings, muscle: MuscleId): SetRange =>
  settings.muscleVolume.muscles[muscle] ?? settings.muscleVolume.default

/** Sotto, nella fascia (estremi compresi) o sopra. */
export function volumeZone(value: number, range: SetRange): VolumeZone {
  if (value < range.min) return 'below'
  if (value > range.max) return 'above'
  return 'in'
}
