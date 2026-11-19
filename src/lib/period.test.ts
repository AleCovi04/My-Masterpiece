import { describe, expect, it } from 'vitest'
import { it as itDict } from '../i18n/it'
import {
  periodLabel,
  shiftAnchor,
  weekDates,
  weekdayShortNames,
} from './period'

describe('period', () => {
  it('la settimana va da lunedì a domenica', () => {
    const w = weekDates('2026-11-15') // domenica
    expect(w[0]).toBe('2026-11-09')
    expect(w[6]).toBe('2026-11-15')
  })
  it('sposta settimana, mese e anno', () => {
    expect(shiftAnchor('week', '2026-11-15', 1)).toBe('2026-11-22')
    expect(shiftAnchor('month', '2026-12-20', 1)).toBe('2027-01-01')
    expect(shiftAnchor('month', '2026-01-20', -1)).toBe('2025-12-01')
    expect(shiftAnchor('year', '2026-06-01', -1)).toBe('2025-01-01')
  })
  it('etichette del periodo', () => {
    expect(periodLabel('week', '2026-11-12', itDict)).toBe('9–15 nov 2026')
    expect(periodLabel('week', '2026-12-30', itDict)).toBe(
      '28 dic 2026 – 3 gen 2027',
    )
    expect(periodLabel('week', '2026-11-30', itDict)).toBe(
      '30 nov – 6 dic 2026',
    )
    expect(periodLabel('month', '2026-11-01', itDict)).toBe('Novembre 2026')
    expect(periodLabel('year', '2026-11-01', itDict)).toBe('2026')
  })
  it('nomi brevi da lunedì', () => {
    expect(weekdayShortNames(itDict)).toEqual([
      'lun',
      'mar',
      'mer',
      'gio',
      'ven',
      'sab',
      'dom',
    ])
  })
})
