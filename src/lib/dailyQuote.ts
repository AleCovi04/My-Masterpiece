// Citazione del giorno: decisa solo dalla data, quindi uguale su ogni dispositivo
// e stabile per tutta la giornata, senza dati da salvare.
import type { IsoDate } from '../data/types'
import { daysBetween } from './dates'

const EPOCH: IsoDate = '2000-01-01'

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

/**
 * Passo della rotazione: vicino a n / φ e primo con n. Così in n giorni
 * escono tutte le citazioni una volta, e due giorni di fila sono lontane nell'elenco.
 */
export function rotationStep(n: number): number {
  if (n <= 2) return 1
  const target = Math.round(n / 1.618)
  for (let d = 0; d < n; d++) {
    for (const s of [target - d, target + d]) {
      if (s > 0 && s < n && gcd(s, n) === 1) return s
    }
  }
  return 1
}

/** Indice della citazione di un giorno, tra 0 e n − 1. */
export function dailyQuoteIndex(date: IsoDate, n: number): number {
  if (n <= 0) return 0
  const day = daysBetween(EPOCH, date)
  const i = (day * rotationStep(n)) % n
  return i < 0 ? i + n : i
}
