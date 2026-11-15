import { describe, expect, it } from 'vitest'
import type { Session } from '../data/types'
import { moveSession, sessionsOn } from './reorder'

const plan = {
  discipline: 'swim',
  distanceM: 1000,
  paceSecPer100m: 120,
} as const

function s(id: string, date: string, order: number): Session {
  return {
    id,
    date,
    order,
    status: 'planned',
    plan,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

const base = [
  s('a', '2026-11-09', 0),
  s('b', '2026-11-09', 1),
  s('c', '2026-11-09', 2),
  s('d', '2026-11-10', 0),
]
const ids = (list: Session[]) => list.map((x) => x.id)

describe('moveSession', () => {
  it('riordina nello stesso giorno', () => {
    const r = moveSession(base, 'a', '2026-11-09', 2)
    expect(ids(sessionsOn(r, '2026-11-09'))).toEqual(['b', 'c', 'a'])
    expect(sessionsOn(r, '2026-11-09').map((x) => x.order)).toEqual([0, 1, 2])
  })
  it('sposta in un altro giorno e rinumera entrambi', () => {
    const r = moveSession(base, 'b', '2026-11-10', 0)
    expect(ids(sessionsOn(r, '2026-11-10'))).toEqual(['b', 'd'])
    expect(ids(sessionsOn(r, '2026-11-09'))).toEqual(['a', 'c'])
    expect(sessionsOn(r, '2026-11-09').map((x) => x.order)).toEqual([0, 1])
  })
  it('sposta in un giorno vuoto', () => {
    const r = moveSession(base, 'd', '2026-11-12', 5)
    expect(sessionsOn(r, '2026-11-12').map((x) => [x.id, x.order])).toEqual([
      ['d', 0],
    ])
  })
  it('senza cambiamenti restituisce lo stesso array', () => {
    expect(moveSession(base, 'b', '2026-11-09', 1)).toBe(base)
    expect(moveSession(base, 'zzz', '2026-11-09', 0)).toBe(base)
  })
  it("non modifica l'input e aggiorna updatedAt solo dove cambia", () => {
    const r = moveSession(
      base,
      'c',
      '2026-11-09',
      0,
      '2026-12-01T00:00:00.000Z',
    )
    expect(base[2].order).toBe(2)
    expect(r.find((x) => x.id === 'd')).toBe(base[3])
    expect(r.find((x) => x.id === 'c')?.updatedAt).toBe(
      '2026-12-01T00:00:00.000Z',
    )
  })
})
