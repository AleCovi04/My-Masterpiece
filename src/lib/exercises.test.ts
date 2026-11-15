import { describe, expect, it } from 'vitest'
import {
  generateSampleExercises,
  generateSampleSessions,
} from '../data/sampleData'
import {
  exerciseUsage,
  formatMmSs,
  isNameTaken,
  parseMmSs,
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
  it('uso negli esercizi di esempio', () => {
    const sessions = generateSampleSessions(new Date(2026, 10, 14, 12))
    expect(
      exerciseUsage('sample-panca', [], sessions).sessions,
    ).toBeGreaterThan(0)
    expect(exerciseUsage('nuovo', [], sessions)).toEqual({
      templates: 0,
      sessions: 0,
    })
  })
})
