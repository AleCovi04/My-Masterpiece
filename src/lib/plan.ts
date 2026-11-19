// Il Piano: fasi e blocchi applicati al calendario, con l'andamento.
// Funzioni pure sopra applicazioni e sedute.
import type { BlockApplication, Id, IsoDate, Session } from '../data/types'
import { addDays, mondayOf, parseIsoDate, toIsoDate } from './dates'
import { actualSeconds, plannedSeconds } from './weekStats'

export interface Progress {
  total: number
  done: number
  skipped: number
  /** Ore previste delle sedute non saltate. */
  plannedS: number
  /** Ore svolte (durata reale). */
  doneS: number
  /** Sedute svolte / totali, in %. */
  pct: number
}

/** Andamento di un gruppo di sedute: le saltate contano come non svolte. */
export function progressOf(sessions: Session[]): Progress {
  let done = 0
  let skipped = 0
  let plannedS = 0
  let doneS = 0
  for (const s of sessions) {
    if (s.status === 'skipped') skipped += 1
    else plannedS += plannedSeconds(s)
    if (s.status === 'done') {
      done += 1
      doneS += actualSeconds(s)
    }
  }
  const total = sessions.length
  return {
    total,
    done,
    skipped,
    plannedS,
    doneS,
    pct: total ? Math.round((done / total) * 100) : 0,
  }
}

export type Timing = 'past' | 'current' | 'future'

const shift = (date: IsoDate, days: number): IsoDate =>
  toIsoDate(addDays(parseIsoDate(date), days))

const timingOf = (start: IsoDate, end: IsoDate, today: IsoDate): Timing =>
  today > end ? 'past' : today < start ? 'future' : 'current'

interface PlanWeek {
  start: IsoDate
  end: IsoDate
  /** Settimana del blocco (da 1) e settimane del blocco. */
  week: number
  weeks: number
  /** Settimana dell'applicazione, da 1. */
  index: number
  progress: Progress
  timing: Timing
}

/** Settimane consecutive dello stesso blocco (un blocco ripetuto dà più gruppi). */
export interface PlanRun {
  key: string
  blockId: Id
  blockName: string
  start: IsoDate
  end: IsoDate
  weeks: PlanWeek[]
  progress: Progress
  timing: Timing
}

export interface PlanItem {
  application: BlockApplication
  start: IsoDate
  end: IsoDate
  runs: PlanRun[]
  /** Tutte le sedute dell'applicazione, anche se spostate in altre settimane. */
  progress: Progress
  timing: Timing
}

const inRange = (sessions: Session[], start: IsoDate, end: IsoDate) =>
  sessions.filter((s) => s.date >= start && s.date <= end)

/** Le voci del Piano in ordine di data, con l'andamento a ogni livello. */
export function buildPlan(
  applications: BlockApplication[],
  sessions: Session[],
  today: IsoDate,
): PlanItem[] {
  return applications
    .map((application): PlanItem => {
      const mine = sessions.filter((s) => s.applicationId === application.id)
      const weeks: PlanWeek[] = application.weeks.map((w, i) => {
        const end = shift(w.start, 6)
        return {
          start: w.start,
          end,
          week: w.week,
          weeks: w.weeks,
          index: i + 1,
          progress: progressOf(inRange(mine, w.start, end)),
          timing: timingOf(w.start, end, today),
        }
      })
      const runs: PlanRun[] = []
      application.weeks.forEach((w, i) => {
        const last = runs[runs.length - 1]
        // nuovo gruppo quando cambia blocco o il blocco ricomincia dalla prima settimana
        if (!last || last.blockId !== w.blockId || w.week === 1) {
          runs.push({
            key: `${application.id}-${i}`,
            blockId: w.blockId,
            blockName: w.blockName,
            start: weeks[i].start,
            end: weeks[i].end,
            weeks: [weeks[i]],
            progress: progressOf([]),
            timing: 'future',
          })
        } else {
          last.weeks.push(weeks[i])
          last.end = weeks[i].end
        }
      })
      for (const r of runs) {
        r.progress = progressOf(inRange(mine, r.start, r.end))
        r.timing = timingOf(r.start, r.end, today)
      }
      const start = application.startDate
      const end = weeks.length ? weeks[weeks.length - 1].end : start
      return {
        application,
        start,
        end,
        runs,
        progress: progressOf(mine),
        timing: timingOf(start, end, today),
      }
    })
    .sort((a, b) =>
      a.start === b.start
        ? a.application.createdAt.localeCompare(b.application.createdAt)
        : a.start.localeCompare(b.start),
    )
}

interface RaceInfo {
  /** Settimane da questa (inclusa) a quella della gara (esclusa). */
  weeksToRace: number
  /** Di queste, quante non sono coperte da nessuna fase o blocco. */
  uncovered: number
}

/** Settimane che mancano alla gara e quante non hanno ancora un piano. */
export function raceInfo(
  items: PlanItem[],
  today: IsoDate,
  raceDate: IsoDate | null,
): RaceInfo | null {
  if (!raceDate || raceDate < today) return null
  const thisMonday = toIsoDate(mondayOf(parseIsoDate(today)))
  const raceMonday = toIsoDate(mondayOf(parseIsoDate(raceDate)))
  const covered = new Set(
    items.flatMap((i) => i.application.weeks.map((w) => w.start)),
  )
  let weeksToRace = 0
  let uncovered = 0
  for (let m = thisMonday; m < raceMonday; m = shift(m, 7)) {
    weeksToRace += 1
    if (!covered.has(m)) uncovered += 1
  }
  return { weeksToRace, uncovered }
}
