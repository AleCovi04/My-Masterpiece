import { describe, expect, it } from 'vitest'
import { generateSampleExercises } from '../data/sampleData'
import type { Exercise, MuscleId } from '../data/types'
import { migrateExercise } from './muscleMigration'
import {
  filterByMuscles,
  formatMmSs,
  isNameTaken,
  parseMmSs,
  primaryMuscles,
  sortedMuscles,
} from './exercises'

describe('esercizi', () => {
  it('mm:ss', () => {
    expect(formatMmSs(165)).toBe('2:45')
    expect(parseMmSs('2:45')).toBe(165)
    expect(parseMmSs(' 0:30 ')).toBe(30)
    expect(parseMmSs('2:75')).toBeNull()
    expect(parseMmSs('0:00')).toBeNull()
    expect(parseMmSs('abc')).toBeNull()
  })
  const ex = generateSampleExercises()
  it('nome unico senza badare a maiuscole e spazi', () => {
    expect(isNameTaken(ex, '  panca   PIANA ')).toBe(true)
    expect(isNameTaken(ex, 'Panca piana', 'sample-panca')).toBe(false)
    expect(isNameTaken(ex, 'Squat')).toBe(false)
  })
  it('muscoli ordinati per percentuale', () => {
    expect(sortedMuscles(ex[0]).map((m) => m.percent)).toEqual([100, 60, 40])
  })
})

describe('filtro per muscoli', () => {
  const mk = (
    id: string,
    name: string,
    muscles: [MuscleId, number][],
  ): Exercise => ({
    id,
    name,
    muscles: muscles.map(([muscle, percent]) => ({ muscle, percent })),
    defaultRestSeconds: 165,
    archived: false,
    createdAt: '',
    updatedAt: '',
  })
  const list = [
    mk('a', 'Panca', [
      ['chest', 100],
      ['triceps', 40],
    ]),
    mk('b', 'Dip', [
      ['triceps', 100],
      ['chest', 60],
    ]),
    mk('c', 'Croci', [['chest', 100]]),
    mk('d', 'Alzate', [['side_delts', 100]]),
    mk('e', 'Pari', [
      ['chest', 50],
      ['triceps', 50],
    ]),
  ]
  it('principale = % più alta, pari merito tutti', () => {
    expect(primaryMuscles(list[4])).toEqual(['chest', 'triceps'])
    expect(primaryMuscles(list[0])).toEqual(['chest'])
  })
  it('un muscolo: sezioni e ordine per somma poi nome', () => {
    const r = filterByMuscles(list, ['triceps'], 'it')
    expect(r.primary.map((m) => m.exercise.id)).toEqual(['b', 'e'])
    expect(r.secondary.map((m) => m.exercise.id)).toEqual(['a'])
  })
  it('più muscoli: solo chi li coinvolge tutti, somma delle %', () => {
    const r = filterByMuscles(list, ['chest', 'triceps'], 'it')
    expect(r.primary.map((m) => [m.exercise.id, m.sum])).toEqual(
      [
        ['a', 140],
        ['b', 160],
        ['e', 100],
      ].sort((x, y) => (y[1] as number) - (x[1] as number)),
    )
    expect(r.secondary).toEqual([])
  })
})

describe('migrazione muscoli', () => {
  it('conserva gli id validi e converte i vecchi nomi', () => {
    const e = {
      muscles: [
        { muscle: 'Petto', percent: 100 },
        { muscle: 'chest', percent: 80 },
        { muscle: 'mid_back', percent: 50 },
      ],
    } as unknown as Exercise
    expect(migrateExercise(e).muscles).toEqual([
      { muscle: 'chest', percent: 100 },
      { muscle: 'mid_back', percent: 50 },
    ])
  })
})
