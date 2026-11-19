// Import di un'attività Garmin: abbinamento alla seduta e costruzione
// dell'eseguito (funzioni pure). Vedi docs/modello-dati.md ("Import Garmin").
import type {
  BrickActual,
  BrickSession,
  EnduranceActual,
  EnduranceMetrics,
  EnduranceSession,
  Id,
  ImportRecord,
  IsoDate,
  IsoDateTime,
  Lap,
  Session,
} from '../data/types'
import { newLeg } from './brick'
import { toIsoDate } from './dates'
import { setSessionActual } from './enduranceActual'
import { movingTime } from './fit/analysis'
import type { FitActivity, FitLap, FitSession } from './fit/types'
import { linkCandidates } from './garminLink'
import { newId } from './ids'
import { emptySession, insertSession } from './sessions'

/** Giorno (ora locale) dell'attività. */
export const activityDate = (act: FitActivity): IsoDate =>
  toIsoDate(new Date(act.startedAt))

const isMultisport = (act: FitActivity) => act.sessions.length > 1

const clean = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T

const r = (v: number | undefined) =>
  v === undefined ? undefined : Math.round(v)

/** Le metriche di una frazione nella forma dell'app. */
function fitMetrics(act: FitActivity, s: FitSession): EnduranceMetrics {
  const pts = act.points.slice(s.pointStart, s.pointEnd)
  return clean({
    durationS: Math.max(1, s.timerS),
    distanceM: s.distanceM ? Math.round(s.distanceM) : undefined,
    avgHr: r(s.avgHr),
    maxHr: r(s.maxHr),
    elevationGainM: s.discipline === 'swim' ? undefined : r(s.ascentM),
    elapsedS: s.elapsedS,
    movingS: s.movingS ?? (pts.length > 1 ? movingTime(pts) : undefined),
    calories: r(s.calories),
    avgCadence: s.avgCadence,
    maxCadence: s.maxCadence,
    avgPowerW: r(s.avgPowerW),
    maxPowerW: r(s.maxPowerW),
    normPowerW: r(s.normPowerW),
    maxSpeed: s.maxSpeed,
    avgTempC: s.avgTempC,
    totalStrokes: s.totalStrokes,
    poolLengthM: s.poolLengthM,
    avgSwolf: s.avgSwolf,
  })
}

const toLap = (l: FitLap): Lap =>
  clean({
    distanceM: Math.round(l.distanceM ?? 0),
    durationS: l.durationS,
    avgHr: r(l.avgHr),
    maxHr: r(l.maxHr),
    avgSpeed: l.avgSpeed,
    avgCadence: l.avgCadence,
    avgPowerW: r(l.avgPowerW),
    elevationGainM: r(l.elevationGainM),
  })

const garminRef = (act: FitActivity) => ({
  activityId: act.key,
  startedAt: act.startedAt,
  hasTrack: act.points.some((p) => p.lat !== undefined),
})

/** Ciò che si tiene dell'eseguito precedente: RPE e note (non arrivano dall'orologio). */
const kept = (prev?: { rpe?: number; notes?: string }) =>
  clean({ rpe: prev?.rpe, notes: prev?.notes })

/** Eseguito di una seduta singola. */
function enduranceActualFromFit(
  act: FitActivity,
  prev?: EnduranceActual,
): EnduranceActual {
  const s = act.sessions[0]
  return {
    discipline: s.discipline,
    source: 'garmin_fit',
    ...fitMetrics(act, s),
    ...kept(prev),
    laps: s.laps.map(toLap),
    garmin: garminRef(act),
  }
}

/** Eseguito di un brick: una frazione dell'attività per frazione del piano (stesso ordine). */
function brickActualFromFit(
  act: FitActivity,
  session: BrickSession,
): BrickActual {
  return {
    discipline: 'brick',
    source: 'garmin_fit',
    legs: act.sessions.map((s, i) => {
      const t = act.transitions.find((x) => x.afterSession === i - 1)
      return {
        legId: session.plan.legs[i].id,
        discipline: s.discipline,
        ...fitMetrics(act, s),
        ...(i > 0 && t && { transitionBeforeS: t.durationS }),
      }
    }),
    ...kept(session.actual),
    garmin: garminRef(act),
  }
}

/** Il brick ha le stesse frazioni dell'attività, nello stesso ordine? */
const sameLegs = (s: BrickSession, act: FitActivity) =>
  s.plan.legs.length === act.sessions.length &&
  s.plan.legs.every((l, i) => l.discipline === act.sessions[i].discipline)

/**
 * Sedute a cui si può abbinare l'attività: stesso giorno e stessa disciplina
 * (per un multisport: un brick con le stesse frazioni), non saltate e non
 * già importate da Garmin.
 */
export function importCandidates(
  sessions: Session[],
  act: FitActivity,
): Session[] {
  const date = activityDate(act)
  if (!isMultisport(act))
    return linkCandidates(sessions, date, act.sessions[0].discipline)
  return sessions
    .filter(
      (s) =>
        s.date === date &&
        s.status !== 'skipped' &&
        s.discipline === 'brick' &&
        s.actual?.source !== 'garmin_fit' &&
        sameLegs(s, act),
    )
    .sort((a, b) => a.order - b.order)
}

/** Seduta "non pianificata" per un'attività senza seduta: in fondo al giorno. */
function unplannedSession(act: FitActivity, now: IsoDateTime, id: Id): Session {
  const date = activityDate(act)
  if (isMultisport(act)) {
    const base = emptySession('brick', date, now, id) as BrickSession
    return {
      ...base,
      plan: { legs: act.sessions.map((s) => newLeg(s.discipline)) },
    }
  }
  return emptySession(act.sessions[0].discipline, date, now, id)
}

interface ImportOutcome {
  sessions: Session[]
  record: ImportRecord
  sessionId: Id
  /** `true` = creata una seduta non pianificata. */
  created: boolean
}

/**
 * Applica l'attività: alla seduta `targetId` (che deve essere tra i
 * candidati) oppure, con `null`, a una seduta nuova non pianificata.
 */
export function applyImport(
  sessions: Session[],
  act: FitActivity,
  targetId: Id | null,
  source: ImportRecord['source'],
  now: IsoDateTime,
  extra: { intervalsId?: string; newSessionId?: Id } = {},
): ImportOutcome {
  let list = sessions
  let target = targetId ? list.find((s) => s.id === targetId) : undefined
  const created = !target
  if (!target) {
    const fresh = unplannedSession(act, now, extra.newSessionId ?? newId())
    const day = list.filter((s) => s.date === fresh.date).length
    list = insertSession(list, fresh, fresh.date, day, now)
    target = list.find((s) => s.id === fresh.id)!
  }
  const actual =
    target.discipline === 'brick'
      ? brickActualFromFit(act, target)
      : enduranceActualFromFit(act, (target as EnduranceSession).actual)
  list = setSessionActual(list, target.id, actual, now)
  return {
    sessions: list,
    sessionId: target.id,
    created,
    record: clean({
      id: act.key,
      createdAt: now,
      updatedAt: now,
      source,
      intervalsId: extra.intervalsId,
      startedAt: act.startedAt,
      sessionId: target.id,
    }),
  }
}
