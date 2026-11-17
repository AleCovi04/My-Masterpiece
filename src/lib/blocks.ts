// Blocchi (settimane tipo) e fasi (sequenze di blocchi): modifica, totali,
// applicazione al calendario e rimozione. Funzioni pure.
import {
  BLOCK_MAX_WEEKS,
  DAYS_PER_WEEK,
  type BlockApplication,
  type BlockItem,
  type BlockWeek,
  type Id,
  type IsoDate,
  type IsoDateTime,
  type Phase,
  type PhaseColor,
  type Session,
  type Sport,
  type TrainingBlock,
  type WorkoutTemplate,
} from '../data/types'
import { brickSecondsBySport } from './brick'
import { addDays, parseIsoDate, toIsoDate } from './dates'
import { templateDurationSec } from './enduranceTemplate'
import { newId } from './ids'
import {
  emptySession,
  insertSession,
  removeSession,
  sessionFromTemplate,
} from './sessions'

// ---------- settimane ----------

export const emptyDays = (): BlockItem[][] =>
  Array.from({ length: DAYS_PER_WEEK }, () => [])

export const newWeek = (): BlockWeek => ({ id: newId(), days: emptyDays() })

/** Copia della settimana con id nuovi. */
export const cloneWeek = (w: BlockWeek): BlockWeek => ({
  id: newId(),
  days: w.days.map((d) => d.map((it) => ({ ...it, id: newId() }))),
})

/** Duplica la settimana `i` subito dopo (al massimo 12 settimane). */
export function duplicateWeek(weeks: BlockWeek[], i: number): BlockWeek[] {
  if (weeks.length >= BLOCK_MAX_WEEKS || !weeks[i]) return weeks
  return [...weeks.slice(0, i + 1), cloneWeek(weeks[i]), ...weeks.slice(i + 1)]
}

/** Il contenuto della settimana `from` sostituisce quello della settimana `to`. */
export function copyWeekOnto(
  weeks: BlockWeek[],
  from: number,
  to: number,
): BlockWeek[] {
  if (from === to || !weeks[from] || !weeks[to]) return weeks
  const copy = cloneWeek(weeks[from])
  return weeks.map((w, k) => (k === to ? { ...copy, id: w.id } : w))
}

/** Toglie la settimana `i` (ne resta sempre almeno una). */
export function removeWeek(weeks: BlockWeek[], i: number): BlockWeek[] {
  if (weeks.length <= 1 || !weeks[i]) return weeks
  return weeks.filter((_, k) => k !== i)
}

export function addItems(
  week: BlockWeek,
  day: number,
  items: BlockItem[],
): BlockWeek {
  return {
    ...week,
    days: week.days.map((d, k) => (k === day ? [...d, ...items] : d)),
  }
}

export function removeItem(week: BlockWeek, itemId: string): BlockWeek {
  return {
    ...week,
    days: week.days.map((d) => d.filter((it) => it.id !== itemId)),
  }
}

/** Sposta un allenamento nel giorno `toDay`, alla posizione `toIndex` della lista senza l'elemento spostato. */
export function moveItem(
  week: BlockWeek,
  itemId: string,
  toDay: number,
  toIndex: number,
): BlockWeek {
  const item = week.days.flat().find((it) => it.id === itemId)
  if (!item || toDay < 0 || toDay >= DAYS_PER_WEEK) return week
  const days = week.days.map((d) => d.filter((it) => it.id !== itemId))
  const target = [...days[toDay]]
  target.splice(Math.max(0, Math.min(toIndex, target.length)), 0, item)
  days[toDay] = target
  return { ...week, days }
}

// ---------- totali ----------

export interface WeekTotals {
  /** Secondi previsti per sport (il brick si divide tra le sue frazioni). */
  bySport: Record<Sport, number>
  totalS: number
  count: number
  /** Allenamenti senza durata nota (sessioni vuote, forza senza durata…). */
  unknown: number
  /** Allenamenti che puntano a un template eliminato. */
  missing: number
}

export function weekTotals(
  week: BlockWeek,
  templates: WorkoutTemplate[],
): WeekTotals {
  const bySport: Record<Sport, number> = {
    swim: 0,
    bike: 0,
    run: 0,
    strength: 0,
  }
  let count = 0
  let unknown = 0
  let missing = 0
  for (const it of week.days.flat()) {
    count += 1
    if (it.kind === 'empty') {
      unknown += 1
      continue
    }
    const t = templates.find((x) => x.id === it.templateId)
    if (!t) {
      missing += 1
      continue
    }
    if (t.discipline === 'brick') {
      const parts = brickSecondsBySport(t.legs, t.estimatedDurationSec)
      const sum = Object.values(parts).reduce((a, s) => a + s, 0)
      if (sum === 0) unknown += 1
      for (const [d, s] of Object.entries(parts)) bySport[d as Sport] += s
      continue
    }
    const s = templateDurationSec(t)
    if (!s) unknown += 1
    else bySport[t.discipline] += s
  }
  const totalS = Object.values(bySport).reduce((a, s) => a + s, 0)
  return { bySport, totalS, count, unknown, missing }
}

// ---------- fasi ----------

export interface SourceWeek {
  block: TrainingBlock
  /** Indice della settimana nel blocco, da 0. */
  index: number
}

/** Le settimane di un blocco, in ordine. */
export const blockWeeks = (block: TrainingBlock): SourceWeek[] =>
  block.weeks.map((_, index) => ({ block, index }))

/** Le settimane di una fase: i blocchi in sequenza (quelli non trovati si saltano). */
export function phaseWeeks(
  phase: Phase,
  blocks: TrainingBlock[],
): SourceWeek[] {
  return phase.blockIds.flatMap((id) => {
    const b = blocks.find((x) => x.id === id)
    return b ? blockWeeks(b) : []
  })
}

// ---------- applicazione al calendario ----------

export const isMonday = (date: IsoDate): boolean =>
  parseIsoDate(date).getDay() === 1

const shift = (date: IsoDate, days: number): IsoDate =>
  toIsoDate(addDays(parseIsoDate(date), days))

export interface ApplyInput {
  kind: 'block' | 'phase'
  sourceId: Id
  name: string
  color?: PhaseColor
  weeks: SourceWeek[]
  /** Lunedì di partenza. */
  start: IsoDate
  /**
   * `append`: in coda alle sedute del giorno. `replace`: prima si tolgono le
   * sedute programmate di quelle settimane. Svolte, in corso e saltate restano.
   */
  mode: 'append' | 'replace'
}

export interface ApplyResult {
  sessions: Session[]
  application: BlockApplication
  /** Sedute create. */
  created: number
  /** Allenamenti saltati perché il template non esiste più. */
  missing: number
  /** Sedute programmate tolte (`replace`). */
  replaced: number
}

/** Sviluppa blocco o fase in sedute con la loro data. Non salva nulla. */
export function planApplication(
  input: ApplyInput,
  sessions: Session[],
  templates: WorkoutTemplate[],
  now: IsoDateTime = new Date().toISOString(),
  appId: Id = newId(),
): ApplyResult {
  let cur = sessions
  let created = 0
  let missing = 0
  let replaced = 0

  if (input.mode === 'replace' && input.weeks.length > 0) {
    const last = shift(input.start, input.weeks.length * 7 - 1)
    const gone = cur.filter(
      (s) => s.status === 'planned' && s.date >= input.start && s.date <= last,
    )
    for (const s of gone) cur = removeSession(cur, s.id, now)
    replaced = gone.length
  }

  input.weeks.forEach(({ block, index }, k) => {
    const week = block.weeks[index]
    week.days.forEach((items, d) => {
      const date = shift(input.start, k * 7 + d)
      for (const it of items) {
        let s: Session
        if (it.kind === 'empty') {
          s = emptySession(it.discipline, date, now)
        } else {
          const t = templates.find((x) => x.id === it.templateId)
          if (!t) {
            missing += 1
            continue
          }
          s = sessionFromTemplate(t, date, now)
        }
        cur = insertSession(
          cur,
          { ...s, applicationId: appId },
          date,
          Number.MAX_SAFE_INTEGER,
          now,
        )
        created += 1
      }
    })
  })

  const application: BlockApplication = {
    id: appId,
    createdAt: now,
    updatedAt: now,
    kind: input.kind,
    sourceId: input.sourceId,
    name: input.name,
    ...(input.color && { color: input.color }),
    startDate: input.start,
    weeks: input.weeks.map(({ block, index }, k) => ({
      start: shift(input.start, k * 7),
      blockId: block.id,
      blockName: block.name,
      week: index + 1,
      weeks: block.weeks.length,
    })),
  }
  return { sessions: cur, application, created, missing, replaced }
}

/** Rimuove un'applicazione: solo le sue sedute ancora programmate; le altre restano. */
export function removeApplication(
  sessions: Session[],
  applications: BlockApplication[],
  appId: Id,
  now: IsoDateTime = new Date().toISOString(),
): { sessions: Session[]; applications: BlockApplication[]; removed: number } {
  const gone = sessions.filter(
    (s) => s.applicationId === appId && s.status === 'planned',
  )
  let cur = sessions
  for (const s of gone) cur = removeSession(cur, s.id, now)
  return {
    sessions: cur,
    applications: applications.filter((a) => a.id !== appId),
    removed: gone.length,
  }
}

/** Etichette della settimana che inizia in `monday` (più applicazioni possono sovrapporsi). */
export function weekLabels(
  applications: BlockApplication[],
  monday: IsoDate,
): {
  application: BlockApplication
  week: BlockApplication['weeks'][number]
}[] {
  return applications.flatMap((application) => {
    const week = application.weeks.find((w) => w.start === monday)
    return week ? [{ application, week }] : []
  })
}
