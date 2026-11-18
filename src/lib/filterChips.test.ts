import { describe, expect, it } from 'vitest'
import { HOLD_MS, isolateChip, toggleChip } from './filterChips'

const ALL = ['a', 'b', 'c'] as const

describe('filtri a chip', () => {
  it('un clic spegne e riaccende, nell’ordine originale, anche l’ultimo', () => {
    expect(toggleChip(ALL, ['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
    expect(toggleChip(ALL, ['c'], 'a')).toEqual(['a', 'c'])
    expect(toggleChip(ALL, ['a'], 'a')).toEqual([])
    expect(toggleChip(ALL, [], 'b')).toEqual(['b'])
  })

  it('la pressione lunga isola il chip; sul chip già isolato riaccende tutti', () => {
    expect(isolateChip(ALL, ['a', 'b', 'c'], 'b')).toEqual(['b'])
    expect(isolateChip(ALL, ['b'], 'b')).toEqual(['a', 'b', 'c'])
    // isolato un altro chip: si passa a quello
    expect(isolateChip(ALL, ['a'], 'c')).toEqual(['c'])
    // da nessun chip attivo si isola quello premuto
    expect(isolateChip(ALL, [], 'a')).toEqual(['a'])
  })

  it('la durata della pressione è una costante di circa 0,5 s', () => {
    expect(HOLD_MS).toBe(500)
  })
})
