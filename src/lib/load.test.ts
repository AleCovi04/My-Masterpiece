import { describe, expect, it } from 'vitest'
import type { BrickSession, Session } from '../data/types'
import {
  fitnessFatigue,
  loadBySport,
  sessionLoad,
  totalLoad,
  withoutRpe,
} from './load'

const now = '2026-11-01T00:00:00.000Z'
const base = { createdAt: now, updatedAt: now, order: 0 }

const run = (
  id: string,
  date: string,
  status: Session['status'],
  min: number,
  rpe?: number,
): Session => ({
  ...base,
  id,
  date,
  status,
  discipline: 'run',
  plan: { mode: 'simple', simple: { goal: 'time', durationS: min * 60 } },
  ...(status === 'done' && {
    actual: {
      discipline: 'run',
      source: 'manual',
      durationS: min * 60,
      laps: [],
      ...(rpe && { rpe }),
    },
  }),
})

const strength = (date: string, min: number, rpe?: number): Session => ({
  ...base,
  id: `f${date}`,
  date,
  status: 'done',
  discipline: 'strength',
  plan: { entries: [] },
  actual: {
    discipline: 'strength',
    startedAt: `${date}T18:00:00.000Z`,
    endedAt: new Date(
      Date.parse(`${date}T18:00:00.000Z`) + min * 60000,
    ).toISOString(),
    exercises: [],
    ...(rpe && { rpe }),
  },
})

const brick: BrickSession = {
  ...base,
  id: 'b',
  date: '2026-11-11',
  status: 'done',
  discipline: 'brick',
  plan: { legs: [] },
  actual: {
    discipline: 'brick',
    source: 'manual',
    rpe: 8,
    legs: [
      { legId: 'l1', discipline: 'bike', durationS: 3600 },
      {
        legId: 'l2',
        discipline: 'run',
        durationS: 1200,
        transitionBeforeS: 60,
      },
    ],
  },
}

describe('sRPE', () => {
  it('minuti × RPE; senza RPE vale 5; solo le svolte', () => {
    expect(sessionLoad(run('a', '2026-11-10', 'done', 60, 7))).toEqual({
      run: 420,
    })
    expect(sessionLoad(run('b', '2026-11-10', 'done', 40))).toEqual({
      run: 200,
    })
    expect(sessionLoad(run('c', '2026-11-10', 'planned', 40))).toEqual({})
    expect(sessionLoad(strength('2026-11-10', 65, 8))).toEqual({
      strength: 520,
    })
  })

  it('brick diviso per sport (transizione con la frazione che segue)', () => {
    expect(sessionLoad(brick)).toEqual({ bike: 480, run: 168 })
  })

  it('somme e sedute senza RPE', () => {
    const list = [
      run('a', '2026-11-10', 'done', 60, 7),
      run('b', '2026-11-12', 'done', 40),
      brick,
    ]
    const l = loadBySport(list)
    expect(l.run).toBe(420 + 200 + 168)
    expect(totalLoad(l)).toBe(420 + 200 + 648)
    expect(withoutRpe(list)).toBe(1)
  })
})

describe('Forma e Fatica', () => {
  it('medie esponenziali giornaliere dalla prima seduta svolta', () => {
    const list = [run('a', '2026-11-01', 'done', 60, 7)] // 420
    const pts = fitnessFatigue(list, '2026-11-02', '2026-11-03')
    expect(pts.map((p) => p.date)).toEqual(['2026-11-02', '2026-11-03'])
    // giorno 1: forma 420/42 = 10, fatica 420/7 = 60; poi decadono
    expect(pts[0].fitness).toBeCloseTo(10 * (41 / 42))
    expect(pts[0].fatigue).toBeCloseTo(60 * (6 / 7))
    expect(pts[1].fatigue).toBeLessThan(pts[0].fatigue)
  })

  it('senza sedute tutto a zero', () => {
    const pts = fitnessFatigue([], '2026-11-02', '2026-11-04')
    expect(pts).toHaveLength(3)
    expect(pts.every((p) => p.fitness === 0 && p.fatigue === 0)).toBe(true)
  })
})
