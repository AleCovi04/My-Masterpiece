import { describe, expect, it } from 'vitest'
import { QUOTE_COUNT, quoteAt } from '../i18n/quotes'
import { addDays, parseIsoDate, toIsoDate } from './dates'
import { dailyQuoteIndex, rotationStep } from './dailyQuote'

const day = (start: string, n: number) =>
  toIsoDate(addDays(parseIsoDate(start), n))

describe('citazione del giorno', () => {
  it('stesso giorno, stessa citazione', () => {
    expect(dailyQuoteIndex('2026-11-19', QUOTE_COUNT)).toBe(
      dailyQuoteIndex('2026-11-19', QUOTE_COUNT),
    )
  })

  it('in N giorni escono tutte, una volta sola', () => {
    const seen = new Set<number>()
    for (let i = 0; i < QUOTE_COUNT; i++) {
      seen.add(dailyQuoteIndex(day('2026-01-01', i), QUOTE_COUNT))
    }
    expect(seen.size).toBe(QUOTE_COUNT)
  })

  it('due giorni di fila sono lontane nell’elenco', () => {
    for (let i = 0; i < 60; i++) {
      const a = dailyQuoteIndex(day('2026-01-01', i), QUOTE_COUNT)
      const b = dailyQuoteIndex(day('2026-01-01', i + 1), QUOTE_COUNT)
      const dist = Math.min(Math.abs(a - b), QUOTE_COUNT - Math.abs(a - b))
      expect(dist).toBeGreaterThan(10)
    }
  })

  it('il passo è primo con il totale', () => {
    for (const n of [1, 2, 3, 10, 97, 120, 121, 365]) {
      const s = rotationStep(n)
      expect(s).toBeGreaterThan(0)
      const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
      expect(gcd(s, n)).toBe(1)
    }
  })

  it('ogni citazione ha testo, autore e opera in entrambe le lingue', () => {
    expect(QUOTE_COUNT).toBeGreaterThanOrEqual(100)
    for (let i = 0; i < QUOTE_COUNT; i++) {
      for (const lang of ['it', 'en'] as const) {
        const q = quoteAt(i, lang)
        expect(q.text.length).toBeGreaterThan(5)
        expect(q.author).not.toBe('')
        expect(q.source).not.toBe('')
      }
    }
  })

  it('nessun testo ripetuto', () => {
    const texts = Array.from(
      { length: QUOTE_COUNT },
      (_, i) => quoteAt(i, 'it').text,
    )
    expect(new Set(texts).size).toBe(QUOTE_COUNT)
  })
})
