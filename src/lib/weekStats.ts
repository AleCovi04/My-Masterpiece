import type { Discipline, IsoDate, Session } from '../data/types'
import { addDays, parseIsoDate, toIsoDate } from './dates'
import { estimateDurationSeconds } from './endurance'
import { estimateStrengthDurationSeconds } from './strength'

export const DISCIPLINES: Discipline[] = ['swim', 'bike', 'run', 'strength']

export function plannedSeconds(s: Session): number {
  return s.plan.discipline === 'strength'
    ? estimateStrengthDurationSeconds(s.plan)
    : estimateDurationSeconds(s.plan)
}

export function actualSeconds(s: Session): number {
  const a = s.actual
  if (!a) return 0
  if (a.discipline === 'strength') {
    if (!a.endedAt) return 0
    return Math.max(
      0,
      Math.round((Date.parse(a.endedAt) - Date.parse(a.startedAt)) / 1000),
    )
  }
  return a.durationS
}

/** Sedute tra il lunedì indicato e la domenica successiva (inclusi). */
export function sessionsInWeek(
  sessions: Session[],
  monday: IsoDate,
): Session[] {
  const sunday = toIsoDate(addDays(parseIsoDate(monday), 6))
  return sessions.filter((s) => s.date >= monday && s.date <= sunday)
}

export interface WeekSummary {
  plannedS: number
  doneS: number
  adherencePct: number
  doneCount: number
  totalCount: number
}

/** Le sedute saltate non contano nelle ore pianificate. */
export function summarize(sessions: Session[], today: IsoDate): WeekSummary {
  const plannedS = sessions
    .filter((s) => s.status !== 'skipped')
    .reduce((a, s) => a + plannedSeconds(s), 0)
  const done = sessions.filter((s) => s.status === 'done')
  const doneS = done.reduce((a, s) => a + actualSeconds(s), 0)
  const due = sessions.filter((s) => s.date <= today)
  const adherencePct = due.length
    ? Math.round(
        (100 * due.filter((s) => s.status === 'done').length) / due.length,
      )
    : 0
  return {
    plannedS,
    doneS,
    adherencePct,
    doneCount: done.length,
    totalCount: sessions.length,
  }
}

export function loadByDiscipline(
  sessions: Session[],
): Record<Discipline, { plannedS: number; actualS: number }> {
  const out = Object.fromEntries(
    DISCIPLINES.map((d) => [d, { plannedS: 0, actualS: 0 }]),
  ) as Record<Discipline, { plannedS: number; actualS: number }>
  for (const s of sessions) {
    const d = s.plan.discipline
    if (s.status !== 'skipped') out[d].plannedS += plannedSeconds(s)
    if (s.status === 'done') out[d].actualS += actualSeconds(s)
  }
  return out
}
