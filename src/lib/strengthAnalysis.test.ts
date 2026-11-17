import { describe, expect, it } from 'vitest'
import type { Exercise, Session } from '../data/types'
import {
  exerciseProgress,
  muscleExercises,
  muscleSetsIn,
  performedExercises,
} from './strength'

const now = '2026-11-01T00:00:00.000Z'
const ex = (id: string, muscles: Exercise['muscles']) => ({ id, muscles })
const exercises = [
  ex('panca', [
    { muscle: 'chest', percent: 100 },
    { muscle: 'triceps', percent: 50 },
  ]),
  ex('dip', [
    { muscle: 'triceps', percent: 100 },
    { muscle: 'chest', percent: 40 },
  ]),
]

const sess = (
  id: string,
  date: string,
  status: Session['status'],
  items: { id: string; sets: [number, number][]; skipped?: boolean }[],
): Session => ({
  id,
  createdAt: now,
  updatedAt: now,
  date,
  order: 0,
  status,
  discipline: 'strength',
  plan: { entries: [] },
  actual: {
    discipline: 'strength',
    startedAt: `${date}T18:00:00.000Z`,
    endedAt: `${date}T19:00:00.000Z`,
    exercises: items.map((it) => ({
      exerciseId: it.id,
      skipped: !!it.skipped,
      sets: it.sets.map(([kg, reps]) => ({ kg, reps, completedAt: now })),
    })),
  },
})

const list: Session[] = [
  sess('a', '2026-11-03', 'done', [
    {
      id: 'panca',
      sets: [
        [80, 8],
        [85, 5],
      ],
    },
    { id: 'dip', sets: [[0, 10]] },
  ]),
  sess('b', '2026-11-10', 'done', [
    {
      id: 'panca',
      sets: [
        [90, 3],
        [80, 10],
        [80, 10],
      ],
    },
  ]),
  sess('c', '2026-11-12', 'skipped', [{ id: 'dip', sets: [[10, 10]] }]),
]

describe('analisi forza', () => {
  it('serie per muscolo pesate, solo sedute svolte', () => {
    const m = muscleSetsIn(list, exercises)
    expect(m.chest).toBeCloseTo(5 + 0.4)
    expect(m.triceps).toBeCloseTo(2.5 + 1)
    expect(m.quads).toBe(0)
  })

  it('esercizi di un muscolo con serie, contributo e migliori', () => {
    const r = muscleExercises(list, exercises, 'triceps')
    expect(r.map((x) => x.exerciseId)).toEqual(['panca', 'dip'])
    expect(r[0]).toMatchObject({ sets: 5, weighted: 2.5, maxKg: 90 })
    expect(r[0].best1Rm).toBeCloseTo(80 * (1 + 10 / 30))
  })

  it('progressione per seduta e frequenza', () => {
    const p = exerciseProgress(list, 'panca')
    expect(p.map((x) => x.date)).toEqual(['2026-11-03', '2026-11-10'])
    expect(p[1]).toMatchObject({ maxKg: 90, volume: 270 + 1600, sets: 3 })
    expect(performedExercises(list)).toEqual(['panca', 'dip'])
  })
})
