// Bozza di un piano endurance (corsa, bici, nuoto o frazione di un brick):
// i numeri restano stringhe finché si digita. Funzioni pure, usate da
// `EndurancePlanEditor` e dalle finestre che lo contengono.
import type {
  EnduranceDiscipline,
  EnduranceItem,
  EnduranceSimple,
  EnduranceStep,
  StepType,
} from '../../data/types'
import {
  distanceDraft,
  formatClock,
  intensityText,
  itemsTotals,
  parseClock,
  parseDistanceM,
  parseIntensity,
  simpleStats,
  type DistUnit,
  type Stats,
  type Totals,
} from '../../lib/enduranceTemplate'
import { newId } from '../../lib/ids'

/** I campi digitati di un passo; il tipo e l'ordine stanno nell'albero. */
export interface Fields {
  by: 'distance' | 'time'
  dist: string
  unit: DistUnit
  time: string
  intensity: string
  notes: string
}

export interface PlanDraft {
  mode: 'simple' | 'structured'
  // modalità semplice
  goal: 'distance' | 'time'
  sDist: string
  sUnit: DistUnit
  sTime: string
  sInt: string
  // modalità strutturata: albero (tipo e ordine) + campi digitati per id
  tree: EnduranceItem[]
  fields: Record<string, Fields>
  reps: Record<string, string>
}

/** Il contenuto di un piano nella forma salvata. */
export interface PlanContent {
  mode: 'simple' | 'structured'
  simple?: EnduranceSimple
  items?: EnduranceItem[]
}

const MAX_TIMES = 99

const stepUnit = (d: EnduranceDiscipline): DistUnit =>
  d === 'bike' ? 'km' : 'm'
const simpleUnit = (d: EnduranceDiscipline): DistUnit =>
  d === 'swim' ? 'm' : 'km'

export const blankFields = (
  d: EnduranceDiscipline,
  type: StepType,
): Fields => ({
  by: type === 'recovery' ? 'time' : 'distance',
  dist: '',
  unit: stepUnit(d),
  time: '',
  intensity: '',
  notes: '',
})

export const newStep = (type: StepType): EnduranceStep => ({
  kind: 'step',
  id: newId(),
  type,
})

const fieldsOf = (s: EnduranceStep, d: EnduranceDiscipline): Fields => {
  const dist = s.distanceM !== undefined ? distanceDraft(s.distanceM) : null
  return {
    by: s.distanceM !== undefined ? 'distance' : 'time',
    dist: dist?.text ?? '',
    unit: dist?.unit ?? stepUnit(d),
    time: s.durationS !== undefined ? formatClock(s.durationS) : '',
    intensity: s.intensity !== undefined ? intensityText(s.intensity, d) : '',
    notes: s.notes ?? '',
  }
}

/** Bozza a partire da un piano salvato (o vuota). */
export function draftFromPlan(
  d: EnduranceDiscipline,
  plan?: PlanContent,
): PlanDraft {
  const sm = plan?.simple
  const smDist =
    sm?.distanceM !== undefined ? distanceDraft(sm.distanceM) : null
  const fields: Record<string, Fields> = {}
  const reps: Record<string, string> = {}
  for (const it of plan?.items ?? []) {
    if (it.kind === 'repeat') reps[it.id] = String(it.times)
    for (const s of it.kind === 'repeat' ? it.steps : [it])
      fields[s.id] = fieldsOf(s, d)
  }
  return {
    mode: plan?.mode ?? 'simple',
    goal: sm?.goal ?? 'distance',
    sDist: smDist?.text ?? '',
    sUnit: smDist?.unit ?? simpleUnit(d),
    sTime: sm?.durationS !== undefined ? formatClock(sm.durationS) : '',
    sInt: sm?.intensity !== undefined ? intensityText(sm.intensity, d) : '',
    tree: plan?.items ?? [],
    fields,
    reps,
  }
}

/** Valore principale (distanza o tempo) valido? */
const mainOk = (f: Fields) =>
  f.by === 'distance'
    ? parseDistanceM(f.dist, f.unit) !== null
    : parseClock(f.time) !== null
export const intensityOk = (f: Fields, d: EnduranceDiscipline) =>
  f.intensity.trim() === '' || parseIntensity(f.intensity, d) !== null
export const timesOk = (raw: string) => {
  const v = raw.trim()
  return /^\d{1,2}$/.test(v) && Number(v) >= 2 && Number(v) <= MAX_TIMES
}

/** Passo vero a partire da albero e campi; i valori non validi diventano "mancanti". */
function buildStep(
  s: EnduranceStep,
  f: Fields,
  d: EnduranceDiscipline,
): EnduranceStep {
  const distanceM = f.by === 'distance' ? parseDistanceM(f.dist, f.unit) : null
  const durationS = f.by === 'time' ? parseClock(f.time) : null
  const intensity = f.intensity.trim() ? parseIntensity(f.intensity, d) : null
  const notes = f.notes.trim()
  return {
    kind: 'step',
    id: s.id,
    type: s.type,
    ...(distanceM !== null && { distanceM }),
    ...(durationS !== null && { durationS }),
    ...(intensity !== null && { intensity }),
    ...(notes && { notes }),
  }
}

export interface DraftEval {
  /** Il piano da salvare (valido solo se `valid`). */
  content: PlanContent
  simple: EnduranceSimple
  simpleStats: Stats
  totals: Totals
  /** Durata calcolata (`null` se non nota). */
  autoDuration: number | null
  simpleBad: boolean
  structBad: boolean
  /** Modalità strutturata senza passi. */
  noSteps: boolean
  valid: boolean
}

/** Valuta la bozza: piano risultante, totali e validità. */
export function evalDraft(d: EnduranceDiscipline, dr: PlanDraft): DraftEval {
  const items: EnduranceItem[] = dr.tree.map((it) =>
    it.kind === 'step'
      ? buildStep(it, dr.fields[it.id], d)
      : {
          ...it,
          times: timesOk(dr.reps[it.id] ?? '') ? Number(dr.reps[it.id]) : 1,
          steps: it.steps.map((s) => buildStep(s, dr.fields[s.id], d)),
        },
  )
  const totals = itemsTotals(d, items)

  const intensity = dr.sInt.trim() ? parseIntensity(dr.sInt, d) : null
  const distanceM = parseDistanceM(dr.sDist, dr.sUnit)
  const durationS = parseClock(dr.sTime)
  // senza intensità il dato complementare (tempo o distanza) si scrive a mano
  const manual = dr.sInt.trim() === ''
  const simple: EnduranceSimple = {
    goal: dr.goal,
    ...((dr.goal === 'distance' || manual) &&
      distanceM !== null && { distanceM }),
    ...((dr.goal === 'time' || manual) && durationS !== null && { durationS }),
    ...(intensity !== null && { intensity }),
  }
  const sStats = simpleStats(d, simple)

  // a distanza senza intensità il tempo è obbligatorio; a tempo la distanza resta facoltativa
  const complementBad =
    manual &&
    (dr.goal === 'distance'
      ? durationS === null
      : dr.sDist.trim() !== '' && distanceM === null)
  const simpleBad =
    (dr.goal === 'distance' ? distanceM === null : durationS === null) ||
    (dr.sInt.trim() !== '' && intensity === null) ||
    complementBad
  const allSteps = dr.tree.flatMap((it) =>
    it.kind === 'repeat' ? it.steps : [it],
  )
  const structBad =
    allSteps.some(
      (s) => !mainOk(dr.fields[s.id]) || !intensityOk(dr.fields[s.id], d),
    ) ||
    dr.tree.some((it) => it.kind === 'repeat' && !timesOk(dr.reps[it.id] ?? ''))
  const noSteps = dr.tree.length === 0

  return {
    content:
      dr.mode === 'simple'
        ? { mode: 'simple', simple }
        : { mode: 'structured', items },
    simple,
    simpleStats: sStats,
    totals,
    autoDuration:
      dr.mode === 'simple'
        ? sStats.durationS
        : totals.durationS > 0
          ? totals.durationS
          : null,
    simpleBad,
    structBad,
    noSteps,
    valid: dr.mode === 'simple' ? !simpleBad : !noSteps && !structBad,
  }
}

/** Copia della bozza con id nuovi per passi e blocchi (duplica frazione). */
export function cloneDraft(dr: PlanDraft): PlanDraft {
  const fields: Record<string, Fields> = {}
  const reps: Record<string, string> = {}
  const step = (s: EnduranceStep): EnduranceStep => {
    const id = newId()
    if (dr.fields[s.id]) fields[id] = { ...dr.fields[s.id] }
    return { ...s, id }
  }
  const tree = dr.tree.map((it): EnduranceItem => {
    if (it.kind === 'step') return step(it)
    const id = newId()
    if (dr.reps[it.id] !== undefined) reps[id] = dr.reps[it.id]
    return { ...it, id, steps: it.steps.map(step) }
  })
  return { ...dr, tree, fields, reps }
}
