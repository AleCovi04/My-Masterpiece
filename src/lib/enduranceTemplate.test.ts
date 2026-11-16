import { describe, expect, it } from 'vitest'
import type { EnduranceItem, EnduranceStep } from '../data/types'
import {
  dissolveBlock,
  formatClock,
  itemsTotals,
  moveNode,
  parseClock,
  parseDistanceM,
  removeNode,
  shiftNode,
  simpleStats,
  stepStats,
  structureSummary,
  wrapStep,
} from './enduranceTemplate'

const step = (
  id: string,
  type: EnduranceStep['type'],
  rest: Partial<EnduranceStep> = {},
): EnduranceStep => ({ kind: 'step', id, type, ...rest })

const labels = { warmup: 'Risc.', recovery: 'Rec.', cooldown: 'Def.' }

const session = (): EnduranceItem[] => [
  step('w', 'warmup', { durationS: 900 }),
  {
    kind: 'repeat',
    id: 'r',
    times: 6,
    steps: [
      step('a', 'work', { distanceM: 400, intensity: 240 }),
      step('b', 'recovery', { durationS: 90 }),
    ],
  },
  step('c', 'cooldown', { durationS: 600 }),
]

const ids = (items: EnduranceItem[]) =>
  items.map((it) =>
    it.kind === 'repeat' ? `${it.id}[${it.steps.map((s) => s.id)}]` : it.id,
  )

describe('lettura dei valori', () => {
  it('tempi e passi', () => {
    expect(parseClock('4:30')).toBe(270)
    expect(parseClock('1:05:00')).toBe(3900)
    expect(parseClock('15')).toBe(900)
    expect(parseClock('4:75')).toBeNull()
    expect(parseClock('0:00')).toBeNull()
    expect(formatClock(270)).toBe('4:30')
    expect(formatClock(3900)).toBe('1:05:00')
  })
  it('distanze', () => {
    expect(parseDistanceM('400', 'm')).toBe(400)
    expect(parseDistanceM('10,5', 'km')).toBe(10500)
    expect(parseDistanceM('', 'm')).toBeNull()
  })
})

describe('distanza e tempo', () => {
  it('corsa: 400 m a 4:00/km = 96 s', () => {
    expect(stepStats('run', { distanceM: 400, intensity: 240 })).toEqual({
      distanceM: 400,
      durationS: 96,
    })
  })
  it('nuoto: 400 m a 1:45/100 m = 420 s', () => {
    expect(
      stepStats('swim', { distanceM: 400, intensity: 105 }).durationS,
    ).toBe(420)
  })
  it('bici: 30 min a 30 km/h = 15 km', () => {
    expect(stepStats('bike', { durationS: 1800, intensity: 30 })).toEqual({
      distanceM: 15000,
      durationS: 1800,
    })
  })
  it('senza intensità resta solo la parte nota', () => {
    expect(stepStats('run', { distanceM: 400 })).toEqual({
      distanceM: 400,
      durationS: null,
    })
    expect(stepStats('run', { durationS: 90 })).toEqual({
      distanceM: null,
      durationS: 90,
    })
  })
  it('semplice: il complementare si calcola', () => {
    expect(
      simpleStats('run', {
        goal: 'distance',
        distanceM: 10000,
        intensity: 330,
      }),
    ).toEqual({ distanceM: 10000, durationS: 3300 })
  })
})

describe('totali', () => {
  it('conta i blocchi N volte e segna le parti incomplete', () => {
    const t = itemsTotals('run', session())
    // distanza nota solo per il lavoro: 6 × 400 m
    expect(t.distanceM).toBe(2400)
    expect(t.distanceComplete).toBe(false)
    // tempo: 900 + 6 × (96 + 90) + 600
    expect(t.durationS).toBe(900 + 6 * 186 + 600)
    expect(t.durationComplete).toBe(true)
  })
  it('completo quando ogni passo ha il dato', () => {
    const t = itemsTotals('bike', [
      step('x', 'work', { distanceM: 30000, intensity: 30 }),
    ])
    expect(t).toMatchObject({
      distanceM: 30000,
      durationS: 3600,
      distanceComplete: true,
      durationComplete: true,
    })
  })
})

describe('riassunto della struttura', () => {
  it('Risc. 15′ · 6×400 m · Def. 10′', () => {
    expect(structureSummary(session(), 'run', labels)).toBe(
      'Risc. 15′ · 6×400 m · Def. 10′',
    )
  })
})

describe('alberi di passi e blocchi', () => {
  it('sposta un passo fuori da un blocco', () => {
    const out = moveNode(session(), 'a', { parentId: null, index: 0 })
    expect(ids(out)).toEqual(['a', 'w', 'r[b]', 'c'])
  })
  it('sposta un passo dentro un blocco', () => {
    const out = moveNode(session(), 'w', { parentId: 'r', index: 1 })
    expect(ids(out)).toEqual(['r[a,w,b]', 'c'])
  })
  it('un blocco non entra in un altro blocco', () => {
    const items = session()
    expect(moveNode(items, 'r', { parentId: 'r', index: 0 })).toBe(items)
  })
  it('un blocco rimasto vuoto sparisce', () => {
    const out = moveNode(
      moveNode(session(), 'a', { parentId: null, index: 0 }),
      'b',
      { parentId: null, index: 0 },
    )
    expect(ids(out)).toEqual(['b', 'a', 'w', 'c'])
  })
  it('sposta un blocco intero', () => {
    expect(ids(moveNode(session(), 'r', { parentId: null, index: 0 }))).toEqual(
      ['r[a,b]', 'w', 'c'],
    )
  })
  it('sciogli, avvolgi, rimuovi, riordina di uno', () => {
    expect(ids(dissolveBlock(session(), 'r'))).toEqual(['w', 'a', 'b', 'c'])
    expect(ids(wrapStep(session(), 'c', 'n'))).toEqual(['w', 'r[a,b]', 'n[c]'])
    expect(ids(removeNode(session(), 'r'))).toEqual(['w', 'c'])
    expect(ids(shiftNode(session(), 'b', -1))).toEqual(['w', 'r[b,a]', 'c'])
    expect(ids(shiftNode(session(), 'w', 1))).toEqual(['r[a,b]', 'w', 'c'])
  })
})
