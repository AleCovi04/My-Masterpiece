// Logica dei filtri a chip, uguale in tutta l'app (componente `FilterChips`).

/** Quanto tenere premuto un chip per isolarlo (ms). */
export const HOLD_MS = 500

/** Movimento oltre cui la pressione lunga si annulla (px): si sta scorrendo la pagina. */
export const HOLD_MOVE_PX = 10

/** Un clic: il chip si accende o si spegne (anche l'ultimo). L'ordine resta quello di `all`. */
export function toggleChip<T>(
  all: readonly T[],
  active: readonly T[],
  key: T,
): T[] {
  return active.includes(key)
    ? active.filter((k) => k !== key)
    : all.filter((k) => k === key || active.includes(k))
}

/** Pressione lunga: resta acceso solo quel chip; sul chip già isolato si riaccendono tutti. */
export function isolateChip<T>(
  all: readonly T[],
  active: readonly T[],
  key: T,
): T[] {
  return active.length === 1 && active[0] === key ? [...all] : [key]
}
