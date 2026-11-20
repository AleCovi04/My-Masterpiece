import type {
  BrickSession,
  BrickTemplate,
  Discipline,
  EnduranceSession,
  EnduranceTemplate,
  Id,
  IsoDate,
  IsoDateTime,
  Session,
  SessionStatus,
  StrengthSession,
  StrengthTemplate,
  WorkoutTemplate,
} from '../data/types'
import { brickDurationSec } from './brick'
import { templateTotals } from './enduranceTemplate'
import { newId } from './ids'
import { sessionsOn } from './reorder'

const stamp = (): IsoDateTime => new Date().toISOString()

/**
 * Nuova seduta con una **copia** del template: da qui in poi le due cose sono
 * indipendenti. L'ordine nel giorno lo assegna `insertSession`.
 */
export function sessionFromTemplate(
  template: WorkoutTemplate,
  date: IsoDate,
  now: IsoDateTime = stamp(),
  id: Id = newId(),
): Session {
  const base = {
    id,
    createdAt: now,
    updatedAt: now,
    date,
    order: 0,
    status: 'planned' as const,
    templateId: template.id,
    name: template.name,
    ...(template.notes && { notes: template.notes }),
    ...(template.estimatedDurationSec && {
      estimatedDurationSec: template.estimatedDurationSec,
    }),
  }
  if (template.discipline === 'strength') {
    return {
      ...base,
      discipline: 'strength',
      plan: { entries: structuredClone(template.entries) },
    }
  }
  if (template.discipline === 'brick') {
    return {
      ...base,
      discipline: 'brick',
      plan: { legs: structuredClone(template.legs) },
    }
  }
  return {
    ...base,
    discipline: template.discipline,
    plan: structuredClone({
      mode: template.mode,
      ...(template.simple && { simple: template.simple }),
      ...(template.items && { items: template.items }),
    }),
  }
}

/** Seduta vuota di una disciplina, senza template. */
export function emptySession(
  discipline: Discipline,
  date: IsoDate,
  now: IsoDateTime = stamp(),
  id: Id = newId(),
): Session {
  const base = {
    id,
    createdAt: now,
    updatedAt: now,
    date,
    order: 0,
    status: 'planned' as const,
  }
  if (discipline === 'brick') {
    return { ...base, discipline, plan: { legs: [] } }
  }
  return discipline === 'strength'
    ? { ...base, discipline, plan: { entries: [] } }
    : {
        ...base,
        discipline,
        plan: { mode: 'simple', simple: { goal: 'distance' } },
      }
}

/**
 * Mette `ordered` (le sedute di `date`, nell'ordine voluto) al posto di quelle
 * del giorno, numerate da 0. Le sedute restano al loro posto nell'elenco (le
 * nuove vanno in fondo) e cambiano solo quelle con un `order` diverso.
 */
function renumber(
  sessions: Session[],
  date: IsoDate,
  ordered: Session[],
  now: IsoDateTime,
): Session[] {
  const next = new Map(
    ordered.map((s, i) => [
      s.id,
      s.date === date && s.order === i
        ? s
        : { ...s, date, order: i, updatedAt: now },
    ]),
  )
  const known = new Set(sessions.map((s) => s.id))
  return [
    ...sessions.map((s) => next.get(s.id) ?? s),
    ...[...next.values()].filter((s) => !known.has(s.id)),
  ]
}

/** Inserisce la seduta in `date` esattamente alla posizione `index` (0 = prima di tutte). */
export function insertSession(
  sessions: Session[],
  session: Session,
  date: IsoDate,
  index: number,
  now: IsoDateTime = stamp(),
): Session[] {
  const day = sessionsOn(sessions, date)
  const at = Math.max(0, Math.min(Math.trunc(index), day.length))
  day.splice(at, 0, session)
  return renumber(sessions, date, day, now)
}

/** Elimina la seduta e richiude l'ordine del suo giorno. */
export function removeSession(
  sessions: Session[],
  id: Id,
  now: IsoDateTime = stamp(),
): Session[] {
  const gone = sessions.find((s) => s.id === id)
  if (!gone) return sessions
  const rest = sessions.filter((s) => s.id !== id)
  return renumber(rest, gone.date, sessionsOn(rest, gone.date), now)
}

/** Copia programmata (senza l'eseguito) subito dopo l'originale, nello stesso giorno. */
export function duplicateSession(
  sessions: Session[],
  id: Id,
  now: IsoDateTime = stamp(),
  copyId: Id = newId(),
): Session[] {
  const src = sessions.find((s) => s.id === id)
  if (!src) return sessions
  const { actual: _actual, ...plain } = structuredClone(src)
  void _actual
  const copy = {
    ...plain,
    id: copyId,
    status: 'planned',
    createdAt: now,
    updatedAt: now,
  } as Session
  const index = sessionsOn(sessions, src.date).findIndex((s) => s.id === id)
  return insertSession(sessions, copy, src.date, index + 1, now)
}

export function setSessionStatus(
  sessions: Session[],
  id: Id,
  status: SessionStatus,
  now: IsoDateTime = stamp(),
): Session[] {
  return sessions.map((s) =>
    s.id === id && s.status !== status ? { ...s, status, updatedAt: now } : s,
  )
}

/** Durata stimata: quella scritta a mano, altrimenti (endurance) quella calcolata. */
export function sessionDurationSec(s: Session): number | null {
  if (s.estimatedDurationSec) return s.estimatedDurationSec
  if (s.discipline === 'strength') return null
  if (s.discipline === 'brick') return brickDurationSec(s.plan.legs)
  return templateTotals({ discipline: s.discipline, ...s.plan }).durationS
}

/** Numero totale di serie previste (forza). */
export function sessionSetsCount(s: StrengthSession): number {
  return s.plan.entries.reduce((n, e) => n + e.sets.length, 0)
}

// ---------- seduta ↔ editor dei template ----------

/**
 * La seduta vista come template, per riusare gli editor del Planner.
 * Non viene mai salvata fra i template.
 */
export function sessionAsTemplate(s: StrengthSession): StrengthTemplate
export function sessionAsTemplate(s: EnduranceSession): EnduranceTemplate
export function sessionAsTemplate(s: BrickSession): BrickTemplate
export function sessionAsTemplate(s: Session): WorkoutTemplate {
  const base = {
    id: s.id,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    name: s.name ?? '',
    ...(s.notes && { notes: s.notes }),
    ...(s.estimatedDurationSec && {
      estimatedDurationSec: s.estimatedDurationSec,
    }),
    archived: false,
  }
  if (s.discipline === 'strength')
    return { ...base, discipline: 'strength', entries: s.plan.entries }
  if (s.discipline === 'brick')
    return { ...base, discipline: 'brick', legs: s.plan.legs }
  return { ...base, discipline: s.discipline, ...s.plan }
}

/** Applica alla sola seduta ciò che è uscito dall'editor (il template d'origine non cambia). */
export function applyEditedPlan(
  s: Session,
  edited: WorkoutTemplate,
  now: IsoDateTime = stamp(),
): Session {
  const {
    name: _n,
    notes: _no,
    estimatedDurationSec: _d,
    plan: _p,
    ...kept
  } = s
  void [_n, _no, _d, _p]
  const meta = {
    ...kept,
    updatedAt: now,
    ...(edited.name && { name: edited.name }),
    ...(edited.notes && { notes: edited.notes }),
    ...(edited.estimatedDurationSec && {
      estimatedDurationSec: edited.estimatedDurationSec,
    }),
  }
  if (edited.discipline === 'strength') {
    return {
      ...meta,
      plan: { entries: structuredClone(edited.entries) },
    } as Session
  }
  if (edited.discipline === 'brick') {
    return {
      ...meta,
      plan: { legs: structuredClone(edited.legs) },
    } as Session
  }
  return {
    ...meta,
    plan: structuredClone({
      mode: edited.mode,
      ...(edited.mode === 'simple'
        ? { simple: edited.simple ?? { goal: 'distance' } }
        : { items: edited.items ?? [] }),
    }),
  } as Session
}
