import { describe, expect, it } from 'vitest'
import {
  blocks,
  expandSets,
  mergeWithNext,
  moveBlock,
  normalizeSupersets,
  parseHm,
  separate,
  supersetLabels,
  topMuscles,
} from './templates'

const mk = (...ids: (string | undefined)[]) =>
  ids.map((s, i) => ({ n: i, ...(s && { supersetId: s }) }))
const order = (items: { n: number }[]) => items.map((x) => x.n)

describe('superserie', () => {
  it('blocchi e etichette', () => {
    const items = mk(undefined, 'x', 'x', undefined, 'y', 'y')
    expect(blocks(items)).toEqual([
      { start: 0, end: 1 },
      { start: 1, end: 3 },
      { start: 3, end: 4 },
      { start: 4, end: 6 },
    ])
    expect([...supersetLabels(items)]).toEqual([
      ['x', 'A'],
      ['y', 'B'],
    ])
  })
  it('il riordino sposta il gruppo unito', () => {
    const items = mk(undefined, 'x', 'x', undefined)
    // blocchi: [0] [1,2] [3]; porto il gruppo in testa
    expect(order(moveBlock(items, 1, 0))).toEqual([1, 2, 0, 3])
    // porto il primo in coda
    expect(order(moveBlock(items, 0, 2))).toEqual([1, 2, 3, 0])
  })
  it('crea con il successivo e unisce i gruppi', () => {
    const merged = mergeWithNext(mk(undefined, undefined, undefined), 0, 's1')
    expect(merged.map((x) => x.supersetId)).toEqual(['s1', 's1', undefined])
    const three = mergeWithNext(merged, 1, 's2')
    expect(three.map((x) => x.supersetId)).toEqual(['s1', 's1', 's1'])
    expect(mergeWithNext(mk(undefined), 0, 's')).toHaveLength(1)
  })
  it('separa: in mezzo divide, a due sciogli', () => {
    const mid = separate(mk('x', 'x', 'x', 'x'), 1, 'n')
    expect(mid.map((x) => x.supersetId)).toEqual([
      undefined,
      undefined,
      'n',
      'n',
    ])
    const two = separate(mk('x', 'x'), 0, 'n')
    expect(two.map((x) => x.supersetId)).toEqual([undefined, undefined])
    const last = separate(mk('x', 'x', 'x'), 2, 'n')
    expect(last.map((x) => x.supersetId)).toEqual(['x', 'x', undefined])
  })
  it('normalizza gli id rimasti soli', () => {
    expect(
      normalizeSupersets(mk('x', undefined)).map((x) => x.supersetId),
    ).toEqual([undefined, undefined])
  })
})

describe('template', () => {
  it('serie e durata', () => {
    expect(expandSets(3, 10, 40, 2)).toEqual([
      { reps: 10, kg: 40, rir: 2 },
      { reps: 10, kg: 40, rir: 2 },
      { reps: 10, kg: 40, rir: 2 },
    ])
    expect(parseHm('1:15')).toBe(4500)
    expect(parseHm('0:45')).toBe(2700)
    expect(parseHm('1:75')).toBeNull()
    expect(parseHm('abc')).toBeNull()
  })
  it('muscoli più coinvolti', () => {
    const t = {
      entries: [
        {
          exerciseId: 'a',
          restSeconds: 90,
          sets: [1, 2, 3].map(() => ({ reps: 8, kg: 50, rir: 2 })),
        },
      ],
    }
    const ex = [
      {
        id: 'a',
        muscles: [
          { muscle: 'triceps' as const, percent: 40 },
          { muscle: 'chest' as const, percent: 100 },
        ],
      },
    ]
    expect(topMuscles(t, ex, 1)).toEqual(['chest'])
    expect(topMuscles(t, ex)).toEqual(['chest', 'triceps'])
  })
})
