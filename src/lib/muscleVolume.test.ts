import { describe, expect, it } from 'vitest'
import { defaultSettings, type Session } from '../data/types'
import { rangeFor, volumeZone, weeklyMuscleSets, weeksIn } from './muscleVolume'

const exercises = [
  {
    id: 'panca',
    muscles: [
      { muscle: 'chest' as const, percent: 100 },
      { muscle: 'triceps' as const, percent: 50 },
    ],
  },
]
const sess = (id: string, date: string, sets: number): Session => ({
  id,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  date,
  order: 0,
  status: 'done',
  discipline: 'strength',
  plan: { entries: [] },
  actual: {
    discipline: 'strength',
    startedAt: `${date}T18:00:00.000Z`,
    exercises: [
      {
        exerciseId: 'panca',
        skipped: false,
        sets: Array.from({ length: sets }, () => ({
          kg: 60,
          reps: 8,
          completedAt: `${date}T18:10:00.000Z`,
        })),
      },
    ],
  },
})

describe('volume settimanale per muscolo', () => {
  it('settimane del periodo, contate solo fino a oggi', () => {
    expect(
      weeksIn({ start: '2026-11-02', end: '2026-11-15' }, '2026-12-01'),
    ).toBe(2)
    // periodo che va oltre oggi: si conta fino a oggi
    expect(
      weeksIn({ start: '2026-11-02', end: '2026-11-29' }, '2026-11-15'),
    ).toBe(2)
    // meno di una settimana: almeno 1
    expect(
      weeksIn({ start: '2026-11-14', end: '2026-11-15' }, '2026-11-15'),
    ).toBe(1)
  })

  it('serie pesate divise per il numero di settimane', () => {
    const v = weeklyMuscleSets(
      [sess('a', '2026-11-03', 12), sess('b', '2026-11-10', 12)],
      exercises,
      2,
    )
    expect(v.chest).toBe(12)
    expect(v.triceps).toBe(6)
    expect(v.quads).toBe(0)
  })

  it('zone rispetto alla fascia (estremi compresi) e fascia per muscolo', () => {
    const s = defaultSettings()
    expect(rangeFor(s, 'chest')).toEqual({ min: 10, max: 20 })
    expect(volumeZone(9.9, rangeFor(s, 'chest'))).toBe('below')
    expect(volumeZone(10, rangeFor(s, 'chest'))).toBe('in')
    expect(volumeZone(20, rangeFor(s, 'chest'))).toBe('in')
    expect(volumeZone(20.1, rangeFor(s, 'chest'))).toBe('above')
    s.muscleVolume.muscles.calves = { min: 6, max: 12 }
    expect(rangeFor(s, 'calves')).toEqual({ min: 6, max: 12 })
    expect(volumeZone(8, rangeFor(s, 'calves'))).toBe('in')
  })
})
