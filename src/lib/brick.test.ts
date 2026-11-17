import { describe, expect, it } from 'vitest'
import type { BrickLeg } from '../data/types'
import {
  brickDurationSec,
  brickSecondsBySport,
  brickSummary,
  brickTotals,
  cloneLegs,
  defaultLegs,
  moveItem,
} from './brick'

const names = { swim: 'Nuoto', bike: 'Bici', run: 'Corsa' }

// bici 30 km a 30 km/h = 1h; corsa 5 km a 5:00/km = 25′
const bike: BrickLeg = {
  id: 'b',
  discipline: 'bike',
  mode: 'simple',
  simple: { goal: 'distance', distanceM: 30000, intensity: 30 },
}
const run: BrickLeg = {
  id: 'r',
  discipline: 'run',
  mode: 'simple',
  simple: { goal: 'distance', distanceM: 5000, intensity: 300 },
  transitionBeforeS: 180,
}

describe('brick', () => {
  it('durata = frazioni + transizioni; la transizione della prima non conta', () => {
    const first = { ...bike, transitionBeforeS: 999 }
    expect(brickTotals([first, run])).toEqual({
      durationS: 3600 + 1500 + 180,
      durationComplete: true,
      transitionsS: 180,
    })
  })

  it('frazione senza intensità: totale parziale; nulla di noto → null', () => {
    const free: BrickLeg = {
      id: 'f',
      discipline: 'run',
      mode: 'simple',
      simple: { goal: 'distance', distanceM: 5000 },
    }
    const t = brickTotals([bike, free])
    expect(t.durationS).toBe(3600)
    expect(t.durationComplete).toBe(false)
    expect(brickDurationSec(defaultLegs())).toBeNull()
    const [b, r] = defaultLegs()
    // le sole transizioni non danno una durata
    expect(brickDurationSec([b, { ...r, transitionBeforeS: 180 }])).toBeNull()
  })

  it('riassunto con le transizioni numerate', () => {
    expect(brickSummary([bike, run], names)).toBe('Bici 1h · T1 3′ · Corsa 25′')
    expect(brickSummary(defaultLegs(), names)).toBe('Bici · Corsa')
  })

  it('durata per sport, scalata se scritta a mano', () => {
    expect(brickSecondsBySport([bike, run])).toEqual({ bike: 3600, run: 1680 })
    expect(brickSecondsBySport([bike, run], 2 * 5280)).toEqual({
      bike: 7200,
      run: 3360,
    })
    expect(brickSecondsBySport(defaultLegs(), 3600)).toEqual({ bike: 3600 })
  })

  it('copia con id nuovi e spostamento in lista', () => {
    const [c] = cloneLegs([bike])
    expect(c.id).not.toBe(bike.id)
    expect(c.simple).toEqual(bike.simple)
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
  })
})
