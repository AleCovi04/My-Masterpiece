// Registrazione dal vivo della forza: funzioni pure sullo stato della schermata
// live (`LiveWorkout`). Vedi docs/modello-dati.md ("Forza dal vivo").
import type {
  ActualExercise,
  Exercise,
  Id,
  IsoDateTime,
  LiveExercise,
  LiveSet,
  LiveWorkout,
  Session,
  StrengthActual,
  StrengthSession,
  TemplateSet,
} from '../data/types'
import { newId } from './ids'
import { lastPerformance, previousSet } from './strength'
import { newRecords, type RecordHit } from './strengthRecords'

/** Serie di un esercizio aggiunto durante la sessione senza storico. */
export const DEFAULT_LIVE_SETS = 3

const liveSet = (t?: TemplateSet): LiveSet => ({
  id: newId(),
  kg: '',
  reps: '',
  ...(t?.reps !== undefined && { targetReps: t.reps }),
  ...(t?.rir !== undefined && { targetRir: t.rir }),
})

// ---------- gruppi e ordine delle serie ----------

interface Slot {
  ex: number
  set: number
}

/** Gruppi `[inizio, fine)`: una superserie = voci consecutive con lo stesso `supersetId`. */
export function liveGroups(list: LiveExercise[]): [number, number][] {
  const out: [number, number][] = []
  let i = 0
  while (i < list.length) {
    let j = i + 1
    const ss = list[i].supersetId
    if (ss) while (j < list.length && list[j].supersetId === ss) j++
    out.push([i, j])
    i = j
  }
  return out
}

/** Lettera della superserie (A, B…) per ogni esercizio, se ne fa parte. */
export function supersetLabels(list: LiveExercise[]): (string | undefined)[] {
  const out: (string | undefined)[] = list.map(() => undefined)
  let n = 0
  for (const [a, b] of liveGroups(list)) {
    if (b - a < 2) continue
    const label = String.fromCharCode(65 + (n++ % 26))
    for (let i = a; i < b; i++) out[i] = label
  }
  return out
}

/** Serie del gruppo in ordine di giro: serie 1 di ogni esercizio, poi serie 2… (saltati esclusi). */
function groupSlots(list: LiveExercise[], [a, b]: [number, number]): Slot[] {
  const members: number[] = []
  for (let i = a; i < b; i++) if (!list[i].skipped) members.push(i)
  const rounds = Math.max(0, ...members.map((i) => list[i].sets.length))
  const out: Slot[] = []
  for (let r = 0; r < rounds; r++) {
    for (const i of members) if (list[i].sets[r]) out.push({ ex: i, set: r })
  }
  return out
}

const allSlots = (list: LiveExercise[]) =>
  liveGroups(list).flatMap((g) => groupSlots(list, g))

const isPending = (list: LiveExercise[], s: Slot) =>
  !list[s.ex].sets[s.set].done

const toFocus = (list: LiveExercise[], s: Slot | undefined) =>
  s ? { exercise: list[s.ex].id, set: s.set } : null

/** Prima serie da fare, nell'ordine dei giri. */
export function firstPending(list: LiveExercise[]): LiveWorkout['focus'] {
  return toFocus(
    list,
    allSlots(list).find((s) => isPending(list, s)),
  )
}

/** Il focus punta ancora a una serie da fare di un esercizio non saltato? Altrimenti si ricalcola. */
function refocus(w: LiveWorkout): LiveWorkout {
  const f = w.focus
  const ex = f && w.exercises.find((e) => e.id === f.exercise)
  const ok = ex && !ex.skipped && ex.sets[f.set] && !ex.sets[f.set].done
  return ok ? w : { ...w, focus: firstPending(w.exercises) }
}

// ---------- avvio e ripresa ----------

/** Stato iniziale dal piano della seduta (copia di voci, serie e obiettivi). */
export function createLiveWorkout(
  session: StrengthSession,
  startedAt: IsoDateTime,
): LiveWorkout {
  const exercises: LiveExercise[] = session.plan.entries.map((e) => ({
    id: newId(),
    exerciseId: e.exerciseId,
    restSeconds: e.restSeconds,
    ...(e.supersetId && { supersetId: e.supersetId }),
    ...(e.notes && { notes: e.notes }),
    skipped: false,
    sets: e.sets.map(liveSet),
  }))
  return {
    version: 1,
    sessionId: session.id,
    startedAt,
    exercises,
    focus: firstPending(exercises),
    rest: null,
  }
}

/** La seduta passa "in corso" e ricorda l'ora di inizio. */
export function startSession(
  sessions: Session[],
  id: Id,
  now: IsoDateTime,
): Session[] {
  return sessions.map((s) =>
    s.id === id && s.discipline === 'strength'
      ? {
          ...s,
          status: 'in_progress',
          updatedAt: now,
          actual: { discipline: 'strength', startedAt: now, exercises: [] },
        }
      : s,
  )
}

/** Sedute di forza in corso. */
export const liveSessions = (sessions: Session[]): StrengthSession[] =>
  sessions.filter(
    (s): s is StrengthSession =>
      s.discipline === 'strength' && s.status === 'in_progress',
  )

/**
 * Stato da riprendere: la bozza salvata se la sua seduta è ancora in corso;
 * altrimenti (bozza persa) si riparte dal piano della seduta in corso, con
 * l'ora di inizio salvata. `null` = nessun allenamento in corso.
 */
export function resumeLive(
  draft: LiveWorkout | null,
  sessions: Session[],
  now: IsoDateTime,
): LiveWorkout | null {
  const active = liveSessions(sessions)
  if (draft && active.some((s) => s.id === draft.sessionId)) return draft
  const s = active[0]
  return s ? createLiveWorkout(s, s.actual?.startedAt ?? now) : null
}

// ---------- serie ----------

/** Valori in grigio di una serie: ultima volta (stessa serie) e obiettivo del piano. */
export interface SetHint {
  kg?: number
  reps?: number
  targetReps?: number
}

export function setHint(
  ex: LiveExercise,
  setIndex: number,
  sessions: Session[],
): SetHint {
  const prev = previousSet(ex.exerciseId, setIndex, sessions)
  return {
    ...(prev && { kg: prev.kg, reps: prev.reps }),
    ...(ex.sets[setIndex]?.targetReps !== undefined && {
      targetReps: ex.sets[setIndex].targetReps,
    }),
  }
}

/** `undefined` = campo vuoto, `null` = valore non valido. */
export function parseKg(text: string): number | null | undefined {
  const t = text.trim().replace(',', '.')
  if (!t) return undefined
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 && n <= 1000 ? n : null
}

export function parseReps(text: string): number | null | undefined {
  const t = text.trim()
  if (!t) return undefined
  const n = Number(t)
  return Number.isInteger(n) && n >= 1 && n <= 999 ? n : null
}

export type ResolvedSet =
  | { ok: true; kg: number; reps: number }
  | { ok: false; kg: boolean; reps: boolean }

/**
 * Valori da registrare al ✓: quelli digitati, altrimenti quelli in grigio
 * (kg: ultima volta; reps: ultima volta, poi obiettivo). Se manca qualcosa
 * (es. kg senza storico) indica quali campi evidenziare.
 */
export function resolveSet(set: LiveSet, hint: SetHint): ResolvedSet {
  const kgTyped = parseKg(set.kg)
  const repsTyped = parseReps(set.reps)
  const kg = kgTyped === undefined ? hint.kg : kgTyped
  const reps =
    repsTyped === undefined ? (hint.reps ?? hint.targetReps) : repsTyped
  if (kg == null || reps == null) {
    return { ok: false, kg: kg == null, reps: reps == null }
  }
  return { ok: true, kg, reps }
}

const mapExercise = (
  w: LiveWorkout,
  exId: string,
  fn: (ex: LiveExercise) => LiveExercise,
): LiveExercise[] => w.exercises.map((e) => (e.id === exId ? fn(e) : e))

const mapSet = (
  w: LiveWorkout,
  exId: string,
  setIndex: number,
  fn: (s: LiveSet) => LiveSet,
): LiveExercise[] =>
  mapExercise(w, exId, (e) => ({
    ...e,
    sets: e.sets.map((s, i) => (i === setIndex ? fn(s) : s)),
  }))

export function editSetText(
  w: LiveWorkout,
  exId: string,
  setIndex: number,
  field: 'kg' | 'reps',
  text: string,
): LiveWorkout {
  return {
    ...w,
    exercises: mapSet(w, exId, setIndex, (s) => ({ ...s, [field]: text })),
  }
}

/**
 * ✓ su una serie: la registra e decide cosa viene dopo.
 * - In una superserie, se nel giro c'è ancora un esercizio da fare, il focus
 *   passa a quello e il recupero non parte.
 * - Altrimenti parte il recupero (quello dell'ultimo esercizio del gruppo) e
 *   il focus va alla prossima serie da fare: prima nello stesso esercizio o
 *   superserie, poi negli esercizi successivi.
 */
export function completeSet(
  w: LiveWorkout,
  exId: string,
  setIndex: number,
  values: { kg: number; reps: number },
  nowMs: number,
): LiveWorkout {
  const exIdx = w.exercises.findIndex((e) => e.id === exId)
  const target = w.exercises[exIdx]
  if (!target || target.skipped || !target.sets[setIndex]) return w
  const list = mapSet(w, exId, setIndex, (s) => ({
    ...s,
    done: {
      kg: values.kg,
      reps: values.reps,
      completedAt: new Date(nowMs).toISOString(),
    },
  }))

  const group = liveGroups(list).find(([a, b]) => exIdx >= a && exIdx < b)!
  const slots = groupSlots(list, group)
  const pos = slots.findIndex((s) => s.ex === exIdx && s.set === setIndex)
  const sameRound = slots
    .slice(pos + 1)
    .find((s) => s.set === setIndex && isPending(list, s))
  if (sameRound) {
    return { ...w, exercises: list, focus: toFocus(list, sameRound) }
  }

  const all = allSlots(list).filter((s) => isPending(list, s))
  const next =
    slots.find((s) => isPending(list, s)) ??
    all.find((s) => s.ex >= group[1]) ??
    all[0]
  if (!next) return { ...w, exercises: list, focus: null, rest: null }

  let last = group[1] - 1
  while (last > group[0] && list[last].skipped) last--
  const restS = list[last].restSeconds
  return {
    ...w,
    exercises: list,
    focus: toFocus(list, next),
    rest: restS > 0 ? { endsAt: nowMs + restS * 1000, totalS: restS } : null,
  }
}

/** Secondo tocco sul ✓: la serie torna da fare e diventa quella corrente. */
export function uncompleteSet(
  w: LiveWorkout,
  exId: string,
  setIndex: number,
): LiveWorkout {
  return {
    ...w,
    exercises: mapSet(w, exId, setIndex, (s) => {
      const { done: _done, ...rest } = s
      void _done
      return rest
    }),
    focus: { exercise: exId, set: setIndex },
  }
}

/** Aggiunge una serie in fondo, con gli stessi obiettivi dell'ultima. */
export function addSet(w: LiveWorkout, exId: string): LiveWorkout {
  return refocus({
    ...w,
    exercises: mapExercise(w, exId, (e) => {
      const last = e.sets[e.sets.length - 1]
      return {
        ...e,
        sets: [
          ...e.sets,
          liveSet(last && { reps: last.targetReps, rir: last.targetRir }),
        ],
      }
    }),
  })
}

/** Toglie l'ultima serie, se non è completata. */
export function removeSet(w: LiveWorkout, exId: string): LiveWorkout {
  const ex = w.exercises.find((e) => e.id === exId)
  const last = ex?.sets[ex.sets.length - 1]
  if (!last || last.done) return w
  return refocus({
    ...w,
    exercises: mapExercise(w, exId, (e) => ({
      ...e,
      sets: e.sets.slice(0, -1),
    })),
  })
}

export function toggleSkip(w: LiveWorkout, exId: string): LiveWorkout {
  const next = {
    ...w,
    exercises: mapExercise(w, exId, (e) => ({ ...e, skipped: !e.skipped })),
  }
  return w.focus
    ? refocus(next)
    : { ...next, focus: firstPending(next.exercises) }
}

/**
 * Aggiunge esercizi dal catalogo in fondo, con il recupero di default e
 * tante serie quante l'ultima volta (altrimenti `DEFAULT_LIVE_SETS`).
 */
export function addExercises(
  w: LiveWorkout,
  picked: Exercise[],
  sessions: Session[],
): LiveWorkout {
  const added: LiveExercise[] = picked.map((e) => ({
    id: newId(),
    exerciseId: e.id,
    restSeconds: e.defaultRestSeconds,
    skipped: false,
    sets: Array.from(
      { length: lastPerformance(e.id, sessions)?.length || DEFAULT_LIVE_SETS },
      () => liveSet(),
    ),
  }))
  return refocus({ ...w, exercises: [...w.exercises, ...added] })
}

/** Sposta un esercizio; `to` è la posizione nella lista senza l'esercizio spostato. */
export function moveExercise(
  w: LiveWorkout,
  from: number,
  to: number,
): LiveWorkout {
  if (from === to || !w.exercises[from]) return w
  const list = [...w.exercises]
  const [moved] = list.splice(from, 1)
  list.splice(Math.max(0, Math.min(to, list.length)), 0, moved)
  return { ...w, exercises: list }
}

// ---------- recupero ----------

/** Secondi che mancano, dai timestamp (giusto anche dopo il background). */
export const restRemainingS = (
  rest: LiveWorkout['rest'],
  nowMs: number,
): number => (rest ? Math.max(0, Math.ceil((rest.endsAt - nowMs) / 1000)) : 0)

/** −15 s / +15 s. A recupero finito, +15 s riparte da adesso. */
export function adjustRest(
  w: LiveWorkout,
  deltaS: number,
  nowMs: number,
): LiveWorkout {
  if (!w.rest) return w
  const endsAt = Math.max(nowMs, Math.max(w.rest.endsAt, nowMs) + deltaS * 1000)
  return {
    ...w,
    rest: { endsAt, totalS: Math.max(1, w.rest.totalS + deltaS) },
  }
}

/** Recupero impostato a mano (0 = nessun recupero). */
export function setRest(
  w: LiveWorkout,
  seconds: number,
  nowMs: number,
): LiveWorkout {
  const s = Math.max(0, Math.round(seconds))
  return {
    ...w,
    rest: s > 0 ? { endsAt: nowMs + s * 1000, totalS: s } : null,
  }
}

export const skipRest = (w: LiveWorkout): LiveWorkout => ({ ...w, rest: null })

// ---------- fine ----------

/**
 * L'eseguito da salvare: solo le serie completate. Un esercizio senza serie
 * completate si salva solo se è stato saltato (`skipped`), altrimenti si ignora.
 */
export function liveActual(
  w: LiveWorkout,
  endedAt: IsoDateTime,
  notes?: string,
  rpe?: number | null,
): StrengthActual {
  const exercises = w.exercises.flatMap((ex): ActualExercise[] => {
    const sets = ex.sets.flatMap((s) => (s.done ? [s.done] : []))
    if (sets.length > 0)
      return [{ exerciseId: ex.exerciseId, skipped: false, sets }]
    return ex.skipped
      ? [{ exerciseId: ex.exerciseId, skipped: true, sets: [] }]
      : []
  })
  const n = notes?.trim()
  return {
    discipline: 'strength',
    startedAt: w.startedAt,
    endedAt,
    exercises,
    ...(n && { notes: n }),
    ...(rpe && rpe >= 1 && rpe <= 10 && { rpe: Math.round(rpe) }),
  }
}

/** La seduta completata con il suo eseguito. */
export function finishSession(
  sessions: Session[],
  actual: StrengthActual,
  sessionId: Id,
  now: IsoDateTime,
): Session[] {
  return sessions.map((s) =>
    s.id === sessionId && s.discipline === 'strength'
      ? { ...s, status: 'done', actual, updatedAt: now }
      : s,
  )
}

/** C'è almeno una serie completata? */
export const hasDoneSets = (w: LiveWorkout): boolean =>
  w.exercises.some((ex) => ex.sets.some((s) => s.done))

/** Allenamento annullato: la seduta torna programmata, senza eseguito. */
export function cancelSession(
  sessions: Session[],
  sessionId: Id,
  now: IsoDateTime,
): Session[] {
  return sessions.map((s) => {
    if (s.id !== sessionId || s.discipline !== 'strength') return s
    const { actual: _gone, ...rest } = s
    void _gone
    return { ...rest, status: 'planned', updatedAt: now }
  })
}

export interface LiveRecord {
  exerciseId: Id
  /** Nuovi record (peso massimo, a N ripetizioni, volume in serie e in seduta). */
  hits: RecordHit[]
}

export interface LiveSummary {
  durationS: number
  setsDone: number
  volumeKg: number
  records: LiveRecord[]
}

/**
 * Riepilogo finale. I record si confrontano con tutte le altre sedute
 * concluse (`strengthRecords.ts`): un esercizio mai fatto prima non ha record
 * (non c'è storico da superare).
 */
export function liveSummary(
  w: LiveWorkout,
  sessions: Session[],
  endedAtMs: number,
): LiveSummary {
  const done = w.exercises.flatMap((ex) =>
    ex.sets.flatMap((s) =>
      s.done ? [{ exerciseId: ex.exerciseId, ...s.done }] : [],
    ),
  )
  const records = newRecords(
    sessions.filter((s) => s.id !== w.sessionId),
    w.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets.flatMap((s) => (s.done ? [s.done] : [])),
    })),
  )
  return {
    durationS: Math.max(
      0,
      Math.round((endedAtMs - Date.parse(w.startedAt)) / 1000),
    ),
    setsDone: done.length,
    volumeKg: done.reduce((sum, s) => sum + s.kg * s.reps, 0),
    records,
  }
}
