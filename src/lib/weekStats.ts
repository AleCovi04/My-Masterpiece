import type { IsoDate, Session, Sport } from '../data/types'
import { brickSecondsBySport } from './brick'
import { addDays, parseIsoDate, toIsoDate } from './dates'
import { sessionDurationSec } from './sessions'

export const DISCIPLINES: Sport[] = ['swim', 'bike', 'run', 'strength']

/** Sport di una seduta: per un brick quelli delle frazioni. */
export const sessionSports = (s: Session): Sport[] =>
  s.discipline === 'brick'
    ? [...new Set(s.plan.legs.map((l) => l.discipline))]
    : [s.discipline]

/** Durata prevista; 0 se non è nota (forza senza durata, endurance senza intensità). */
export function plannedSeconds(s: Session): number {
  return sessionDurationSec(s) ?? 0
}

export function actualSeconds(s: Session): number {
  const a = s.actual
  if (!a) return 0
  if ('startedAt' in a) {
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
): Record<Sport, { plannedS: number; actualS: number }> {
  const out = Object.fromEntries(
    DISCIPLINES.map((d) => [d, { plannedS: 0, actualS: 0 }]),
  ) as Record<Sport, { plannedS: number; actualS: number }>
  for (const s of sessions) {
    if (s.discipline === 'brick') {
      // il brick si divide tra gli sport delle frazioni (l'eseguito arriverà con la registrazione endurance)
      if (s.status === 'skipped') continue
      const parts = brickSecondsBySport(s.plan.legs, s.estimatedDurationSec)
      for (const [d, sec] of Object.entries(parts))
        out[d as Sport].plannedS += sec
      continue
    }
    const d = s.discipline
    if (s.status !== 'skipped') out[d].plannedS += plannedSeconds(s)
    if (s.status === 'done') out[d].actualS += actualSeconds(s)
  }
  return out
}
