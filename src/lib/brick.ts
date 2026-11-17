// Brick: più frazioni endurance di fila, con transizioni facoltative.
import type {
  BrickLeg,
  EnduranceDiscipline,
  EnduranceItem,
  EnduranceSimple,
} from '../data/types'
import {
  formatDist,
  formatShortTime,
  templateTotals,
} from './enduranceTemplate'
import { newId } from './ids'

/** Totali di una frazione (stesse regole dei piani endurance). */
export const legTotals = (leg: BrickLeg) =>
  templateTotals({
    discipline: leg.discipline,
    mode: leg.mode,
    simple: leg.simple,
    items: leg.items,
  })

export interface BrickTotals {
  /** Somma delle frazioni note più le transizioni; 0 se non si sa nulla. */
  durationS: number
  /** Falso se qualche frazione non ha una durata calcolabile. */
  durationComplete: boolean
  transitionsS: number
}

/**
 * Durata del brick: frazioni (dove calcolabili) + transizioni. La transizione
 * della prima frazione non conta. Se nessuna frazione ha una durata
 * calcolabile la durata è ignota (0): le sole transizioni non bastano.
 */
export function brickTotals(legs: BrickLeg[]): BrickTotals {
  let durationS = 0
  let transitionsS = 0
  let durationComplete = legs.length > 0
  let anyLeg = false
  legs.forEach((leg, i) => {
    const t = legTotals(leg)
    if (t.durationS === null) durationComplete = false
    else {
      anyLeg = true
      durationS += t.durationS
      if (!t.durationComplete) durationComplete = false
    }
    if (i > 0 && leg.transitionBeforeS) transitionsS += leg.transitionBeforeS
  })
  return {
    durationS: anyLeg ? durationS + transitionsS : 0,
    durationComplete,
    transitionsS,
  }
}

/** Durata calcolata (`null` se non si sa nulla). */
export function brickDurationSec(legs: BrickLeg[]): number | null {
  const t = brickTotals(legs)
  return t.durationS > 0 ? t.durationS : null
}

/**
 * Durata prevista per sport, per la Panoramica: ogni frazione conta la sua
 * durata più la transizione che la precede. Con la durata scritta a mano
 * (`overrideS`) le parti si scalano in proporzione; senza durate note tutto
 * va alla prima frazione.
 */
export function brickSecondsBySport(
  legs: BrickLeg[],
  overrideS?: number,
): Partial<Record<EnduranceDiscipline, number>> {
  const anyLeg = legs.some((leg) => legTotals(leg).durationS !== null)
  const parts = legs.map((leg, i) => ({
    d: leg.discipline,
    s:
      (legTotals(leg).durationS ?? 0) +
      (i > 0 ? (leg.transitionBeforeS ?? 0) : 0),
  }))
  const known = anyLeg ? parts.reduce((a, p) => a + p.s, 0) : 0
  const out: Partial<Record<EnduranceDiscipline, number>> = {}
  const add = (d: EnduranceDiscipline, s: number) => {
    out[d] = (out[d] ?? 0) + s
  }
  if (known === 0) {
    if (overrideS && parts[0]) add(parts[0].d, overrideS)
    return out
  }
  const k = overrideS ? overrideS / known : 1
  for (const p of parts) if (p.s > 0) add(p.d, Math.round(p.s * k))
  return out
}

/** Sport delle frazioni, in ordine (per le icone in fila). */
export const brickSports = (legs: BrickLeg[]): EnduranceDiscipline[] =>
  legs.map((l) => l.discipline)

/** "Bici 1h · T1 3′ · Corsa 20′": per ogni frazione la durata, altrimenti la distanza. */
export function brickSummary(
  legs: BrickLeg[],
  names: Record<EnduranceDiscipline, string>,
): string {
  let t = 0
  return legs
    .flatMap((leg, i) => {
      const out: string[] = []
      if (i > 0 && leg.transitionBeforeS) {
        t += 1
        out.push(`T${t} ${formatShortTime(leg.transitionBeforeS)}`)
      }
      const amount = legAmount(leg)
      out.push(
        amount ? `${names[leg.discipline]} ${amount}` : names[leg.discipline],
      )
      return out
    })
    .join(' · ')
}

/** Quantità di una frazione: la durata se calcolabile, altrimenti la distanza ('' se nessuna). */
export function legAmount(leg: BrickLeg): string {
  const tot = legTotals(leg)
  if (tot.durationS !== null) return formatShortTime(tot.durationS)
  if (tot.distanceM !== null) return formatDist(tot.distanceM, leg.discipline)
  return ''
}

/** Frazione vuota (modalità semplice, a distanza). */
export const newLeg = (
  discipline: EnduranceDiscipline,
  id: string = newId(),
): BrickLeg => ({
  id,
  discipline,
  mode: 'simple',
  simple: { goal: 'distance' },
})

/** Copia profonda delle frazioni con id nuovi (anche per passi e blocchi). */
export function cloneLegs(legs: BrickLeg[]): BrickLeg[] {
  return legs.map((leg) => ({
    ...structuredClone(leg),
    id: newId(),
    ...(leg.items && { items: cloneItems(leg.items) }),
  }))
}

function cloneItems(items: EnduranceItem[]): EnduranceItem[] {
  return items.map((it) =>
    it.kind === 'step'
      ? { ...structuredClone(it), id: newId() }
      : {
          ...structuredClone(it),
          id: newId(),
          steps: it.steps.map((s) => ({ ...structuredClone(s), id: newId() })),
        },
  )
}

/** Piano della frazione nella forma salvata: solo la parte della modalità scelta. */
export function legPlan(
  mode: 'simple' | 'structured',
  simple: EnduranceSimple | undefined,
  items: EnduranceItem[] | undefined,
): Pick<BrickLeg, 'mode' | 'simple' | 'items'> {
  return mode === 'simple'
    ? { mode, simple: simple ?? { goal: 'distance' } }
    : { mode, items: items ?? [] }
}

/** Sposta l'elemento `from` in `to` (posizione nella lista senza l'elemento spostato). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return list
  const out = [...list]
  const [moved] = out.splice(from, 1)
  out.splice(Math.max(0, Math.min(to, out.length)), 0, moved)
  return out
}
