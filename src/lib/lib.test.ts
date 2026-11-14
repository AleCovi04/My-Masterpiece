import { describe, expect, it } from 'vitest'
import type { ActualExercise, Exercise, Session } from '../data/types'
import { estimateDurationSeconds } from './endurance'
import {
  lastPerformance,
  personalRecords,
  setsPerMuscle,
  suggestSet,
  totalVolume,
} from './strength'

const t = '2026-01-01T00:00:00.000Z'
const set = (kg: number, reps: number, rir = 2) => ({
  kg,
  reps,
  rir,
  completedAt: t,
})
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
  plan: { discipline: 'strength', exercises: [] },
  actual: { discipline: 'strength', startedAt: t, exercises },
})

describe('durata endurance', () => {
  it('corsa continua', () =>
    expect(
      estimateDurationSeconds({
        discipline: 'run',
        mode: 'steady',
        distanceM: 10000,
        paceSecPerKm: 300,
      }),
    ).toBe(3000))
  it('corsa a intervalli', () =>
    expect(
      estimateDurationSeconds({
        discipline: 'run',
        mode: 'intervals',
        intervals: [
          { distanceM: 400, paceSecPerKm: 240, walkRestSeconds: 60 },
          { distanceM: 400, paceSecPerKm: 240, walkRestSeconds: 60 },
        ],
      }),
    ).toBe(312))
  it('bici', () =>
    expect(
      estimateDurationSeconds({
        discipline: 'bike',
        distanceM: 30000,
        avgSpeedKmh: 30,
      }),
    ).toBe(3600))
  it('nuoto', () =>
    expect(
      estimateDurationSeconds({
        discipline: 'swim',
        distanceM: 1000,
        paceSecPer100m: 110,
      }),
    ).toBe(1100))
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
  it('proposta: ultima volta, altrimenti piano', () => {
    expect(suggestSet(0, { kg: 50, reps: 10 }, [set(70, 8)])).toMatchObject({
      kg: 70,
    })
    expect(suggestSet(0, { kg: 50, reps: 10 }, undefined)).toEqual({
      kg: 50,
      reps: 10,
    })
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
