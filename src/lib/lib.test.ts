import { describe, expect, it } from 'vitest'
import type { ActualExercise, Exercise, Session } from '../data/types'
import {
  lastPerformance,
  personalRecords,
  setsPerMuscle,
  previousSet,
  totalVolume,
} from './strength'

const t = '2026-01-01T00:00:00.000Z'
const set = (kg: number, reps: number) => ({ kg, reps, completedAt: t })
const session = (
  date: string,
  exercises: ActualExercise[],
  status: Session['status'] = 'done',
): Session => ({
  id: date,
  createdAt: t,
  updatedAt: t,
  date,
  order: 0,
  status,
  discipline: 'strength',
  plan: { entries: [] },
  actual: { discipline: 'strength', startedAt: t, exercises },
})

describe('forza', () => {
  const sessions = [
    session('2026-01-01', [
      { exerciseId: 'a', skipped: false, sets: [set(80, 5), set(60, 12)] },
    ]),
    session('2026-01-08', [
      { exerciseId: 'a', skipped: false, sets: [set(70, 8)] },
    ]),
    session(
      '2026-01-15',
      [{ exerciseId: 'a', skipped: false, sets: [set(200, 1)] }],
      'planned',
    ),
  ]

  it('volume', () => expect(totalVolume([set(80, 5), set(60, 12)])).toBe(1120))
  it('PR ignora sedute non concluse', () => {
    const pr = personalRecords('a', sessions)
    expect(pr.maxKg).toMatchObject({ kg: 80, date: '2026-01-01' })
    expect(pr.bestSet).toMatchObject({ kg: 60, reps: 12, volume: 720 })
  })
  it('ultima volta', () =>
    expect(lastPerformance('a', sessions)).toEqual([set(70, 8)]))
  it('ultima volta, stessa serie, qualsiasi allenamento', () => {
    expect(previousSet('a', 0, sessions)).toEqual({ kg: 70, reps: 8 })
    // l'ultima seduta ha una sola serie: per la seconda si risale a quella prima
    expect(previousSet('a', 1, sessions)).toEqual({ kg: 60, reps: 12 })
    expect(previousSet('a', 2, sessions)).toBeUndefined()
    expect(previousSet('b', 0, sessions)).toBeUndefined()
  })
  it('serie per muscolo', () => {
    const panca: Pick<Exercise, 'id' | 'muscles'> = {
      id: 'panca',
      muscles: [
        { muscle: 'chest', percent: 100 },
        { muscle: 'triceps', percent: 40 },
      ],
    }
    const r = setsPerMuscle(
      [{ exerciseId: 'panca', skipped: false, sets: [set(80, 5), set(80, 5)] }],
      [panca],
    )
    expect(r.chest).toBe(2)
    expect(r.triceps).toBeCloseTo(0.8)
    expect(r.calves).toBe(0)
  })
})
