// Dai messaggi decodificati di un FIT all'attività (funzione pura, testabile).
import type { EnduranceDiscipline } from '../../data/types'
import type {
  FitActivity,
  FitLap,
  FitLength,
  FitMessages,
  FitPoint,
  FitSession,
  FitZones,
} from './types'

type Msg = Record<string, unknown>

const SEMICIRCLE = 180 / 2 ** 31

const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined

/** Come `num`, ma 0 = assente (l'orologio scrive 0 quando non misura). */
const pos = (v: unknown): number | undefined => {
  const n = num(v)
  return n !== undefined && n > 0 ? n : undefined
}

const time = (v: unknown): number | undefined =>
  v instanceof Date && !Number.isNaN(v.getTime()) ? v.getTime() : undefined

const round = (v: number | undefined, digits = 0) =>
  v === undefined ? undefined : Math.round(v * 10 ** digits) / 10 ** digits

/** Sport del FIT → disciplina dell'app; `null` = attività da ignorare. */
function disciplineOf(sport: unknown): EnduranceDiscipline | null {
  if (sport === 'running') return 'run'
  if (sport === 'cycling' || sport === 'eBiking') return 'bike'
  if (sport === 'swimming') return 'swim'
  return null
}

/** Cadenza della corsa: il FIT la scrive per una gamba. */
const cadence = (
  discipline: EnduranceDiscipline,
  value: unknown,
  fraction?: unknown,
) => {
  const c = pos(value)
  if (c === undefined) return undefined
  const full = c + (num(fraction) ?? 0)
  return Math.round(discipline === 'run' ? full * 2 : full)
}

function zones(
  messages: FitMessages,
  sessionIndex: number,
  kind: 'Hr' | 'Power',
): FitZones | undefined {
  const z = (messages.timeInZoneMesgs ?? []).find(
    (m) => m.referenceMesg === 'session' && m.referenceIndex === sessionIndex,
  )
  const seconds = z?.[`timeIn${kind}Zone`]
  const boundaries = z?.[`${kind.toLowerCase()}ZoneHighBoundary`]
  if (!Array.isArray(seconds) || !Array.isArray(boundaries)) return undefined
  if (!seconds.some((s) => typeof s === 'number' && s > 0)) return undefined
  return {
    boundaries: boundaries.filter((b): b is number => typeof b === 'number'),
    seconds: seconds.map((s) => (typeof s === 'number' ? Math.round(s) : 0)),
  }
}

function toPoint(r: Msg, t0: number): FitPoint | null {
  const ts = time(r.timestamp)
  if (ts === undefined) return null
  const lat = num(r.positionLat)
  const lon = num(r.positionLong)
  const p: FitPoint = { t: (ts - t0) / 1000 }
  const d = num(r.distance)
  if (d !== undefined) p.d = d
  if (lat !== undefined && lon !== undefined && (lat !== 0 || lon !== 0)) {
    p.lat = lat * SEMICIRCLE
    p.lon = lon * SEMICIRCLE
  }
  const alt = num(r.enhancedAltitude) ?? num(r.altitude)
  if (alt !== undefined) p.alt = alt
  const hr = pos(r.heartRate)
  if (hr !== undefined) p.hr = hr
  const v = num(r.enhancedSpeed) ?? num(r.speed)
  if (v !== undefined) p.v = v
  const cad = num(r.cadence)
  if (cad !== undefined) p.cad = cad + (num(r.fractionalCadence) ?? 0)
  const pw = num(r.power)
  if (pw !== undefined) p.pw = pw
  const temp = num(r.temperature)
  if (temp !== undefined) p.temp = temp
  return p
}

function toLap(l: Msg, discipline: EnduranceDiscipline, t0: number): FitLap {
  const start = time(l.startTime) ?? t0
  return {
    startS: (start - t0) / 1000,
    durationS: Math.round(num(l.totalTimerTime) ?? 0),
    elapsedS: Math.round(num(l.totalElapsedTime) ?? 0),
    distanceM: round(num(l.totalDistance), 1),
    avgHr: pos(l.avgHeartRate),
    maxHr: pos(l.maxHeartRate),
    avgSpeed: num(l.enhancedAvgSpeed) ?? num(l.avgSpeed),
    avgCadence: cadence(discipline, l.avgCadence, l.avgFractionalCadence),
    avgPowerW: pos(l.avgPower),
    elevationGainM: num(l.totalAscent),
  }
}

function toLength(l: Msg): FitLength {
  return {
    durationS: num(l.totalTimerTime) ?? num(l.totalElapsedTime) ?? 0,
    strokes: num(l.totalStrokes),
    stroke: typeof l.swimStroke === 'string' ? l.swimStroke : undefined,
    active: l.lengthType !== 'idle',
  }
}

/** Ordina per ora d'inizio, così un messaggio fuori posto non sposta le frazioni. */
const byStart = (a: Msg, b: Msg) =>
  (time(a.startTime) ?? 0) - (time(b.startTime) ?? 0)

const within = (m: Msg, from: number, to: number) => {
  const s = time(m.startTime) ?? time(m.timestamp)
  return s !== undefined && s >= from && s < to
}

/**
 * Legge l'attività. Le frazioni non di corsa, bici o nuoto si ignorano
 * (le transizioni di un multisport diventano `transitions`); se non ne resta
 * nessuna il risultato è `null`.
 */
export function parseFit(messages: FitMessages): FitActivity | null {
  const sessionsRaw = [...(messages.sessionMesgs ?? [])].sort(byStart)
  if (sessionsRaw.length === 0) return null
  const records = messages.recordMesgs ?? []
  const fileId = (messages.fileIdMesgs ?? [])[0] ?? {}
  const t0 =
    time(sessionsRaw[0].startTime) ??
    time(records[0]?.timestamp) ??
    time(fileId.timeCreated)
  if (t0 === undefined) return null

  const points: FitPoint[] = []
  for (const r of records) {
    const p = toPoint(r, t0)
    if (p && p.t >= 0 && (!points.length || p.t > points[points.length - 1].t))
      points.push(p)
  }

  const laps = [...(messages.lapMesgs ?? [])].sort(byStart)
  const lengths = [...(messages.lengthMesgs ?? [])].sort(byStart)
  const sessions: FitSession[] = []
  const transitions: FitActivity['transitions'] = []

  sessionsRaw.forEach((s, index) => {
    const start = time(s.startTime) ?? t0
    const elapsed = num(s.totalElapsedTime) ?? 0
    const end = start + elapsed * 1000
    const discipline = disciplineOf(s.sport)
    if (!discipline) {
      if (s.sport === 'transition' && sessions.length > 0)
        transitions.push({
          afterSession: sessions.length - 1,
          durationS: Math.round(elapsed),
        })
      return
    }
    const startS = (start - t0) / 1000
    const endS = startS + elapsed
    let pointStart = points.findIndex((p) => p.t >= startS)
    if (pointStart < 0) pointStart = points.length
    let pointEnd = points.findIndex((p) => p.t > endS)
    if (pointEnd < 0) pointEnd = points.length
    // distanza relativa alla frazione (un multisport non sempre la azzera);
    // cadenza della corsa in passi al minuto
    const first = points
      .slice(pointStart, pointEnd)
      .find((p) => p.d !== undefined)?.d
    for (let i = pointStart; i < pointEnd; i++) {
      const p = points[i]
      if (sessionsRaw.length > 1 && first && p.d !== undefined)
        points[i] = { ...p, d: p.d - first }
      if (discipline === 'run' && p.cad !== undefined)
        points[i] = { ...points[i], cad: Math.round(p.cad * 2) }
    }
    const lengthList = lengths
      .filter((l) => within(l, start, end + 1000))
      .map(toLength)
    const poolLengthM = pos(s.poolLength)
    const active = lengthList.filter((l) => l.active && l.strokes !== undefined)
    const avgSwolf =
      pos(s.avgSwolf) ??
      (poolLengthM && active.length
        ? Math.round(
            active.reduce((sum, l) => sum + l.durationS + (l.strokes ?? 0), 0) /
              active.length,
          )
        : undefined)
    const runCadence = discipline === 'run'
    sessions.push({
      discipline,
      subSport:
        typeof s.subSport === 'string' && s.subSport !== 'generic'
          ? s.subSport
          : undefined,
      startedAt: new Date(start).toISOString(),
      startS,
      elapsedS: Math.round(elapsed),
      timerS: Math.round(num(s.totalTimerTime) ?? elapsed),
      movingS: round(num(s.totalMovingTime)),
      distanceM: round(num(s.totalDistance), 1),
      avgHr: pos(s.avgHeartRate),
      maxHr: pos(s.maxHeartRate),
      avgSpeed: num(s.enhancedAvgSpeed) ?? num(s.avgSpeed),
      maxSpeed: num(s.enhancedMaxSpeed) ?? num(s.maxSpeed),
      ascentM: num(s.totalAscent),
      descentM: num(s.totalDescent),
      calories: pos(s.totalCalories),
      avgCadence: cadence(
        discipline,
        runCadence ? (s.avgRunningCadence ?? s.avgCadence) : s.avgCadence,
        s.avgFractionalCadence,
      ),
      maxCadence: cadence(
        discipline,
        runCadence ? (s.maxRunningCadence ?? s.maxCadence) : s.maxCadence,
        s.maxFractionalCadence,
      ),
      avgPowerW: pos(s.avgPower),
      maxPowerW: pos(s.maxPower),
      normPowerW: pos(s.normalizedPower),
      avgTempC: num(s.avgTemperature),
      maxTempC: num(s.maxTemperature),
      trainingEffect: pos(s.totalTrainingEffect),
      poolLengthM,
      totalStrokes: pos(s.totalStrokes),
      avgSwolf,
      pointStart,
      pointEnd,
      laps: laps
        .filter((l) => within(l, start, end + 1000))
        .map((l) => toLap(l, discipline, t0)),
      lengths: lengthList,
      hrZones: zones(messages, index, 'Hr'),
      powerZones: zones(messages, index, 'Power'),
    })
  })
  if (sessions.length === 0) return null

  const serial = num(fileId.serialNumber) ?? 0
  const created = time(fileId.timeCreated) ?? t0
  return {
    key: `${serial}-${Math.round(created / 1000)}`,
    startedAt: new Date(t0).toISOString(),
    sessions,
    transitions,
    points,
  }
}
