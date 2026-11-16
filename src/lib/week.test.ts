import { describe, expect, it } from 'vitest'
import type { Session } from '../data/types'
import { daysBetween, mondayOf, toIsoDate } from './dates'
import { loadByDiscipline, sessionsInWeek, summarize } from './weekStats'

describe('dates', () => {
  it('mondayOf restituisce il lunedì', () => {
    expect(toIsoDate(mondayOf(new Date(2026, 10, 15)))).toBe('2026-11-09')
    expect(toIsoDate(mondayOf(new Date(2026, 10, 9)))).toBe('2026-11-09')
  })
  it('daysBetween conta i giorni di calendario', () => {
    expect(daysBetween('2026-11-14', '2026-11-21')).toBe(7)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
  })
})

describe('settimana', () => {
  const stamp = '2026-11-09T00:00:00.000Z'
  const mk = (
    id: string,
    date: string,
    status: Session['status'],
    durationS?: number,
  ): Session => ({
    id,
    createdAt: stamp,
    updatedAt: stamp,
    date,
    order: 0,
    status,
    discipline: 'bike',
    // 30 km a 30 km/h = 1 h
    plan: {
      mode: 'simple',
      simple: { goal: 'distance', distanceM: 30000, intensity: 30 },
    },
    ...(durationS !== undefined && {
      actual: {
        discipline: 'bike' as const,
        source: 'manual' as const,
        distanceM: 30000,
        durationS,
        laps: [],
      },
    }),
  })
  const sessions = [
    mk('a', '2026-11-09', 'done', 3300),
    mk('b', '2026-11-11', 'skipped'),
    mk('c', '2026-11-14', 'planned'),
    mk('d', '2026-11-15', 'planned'),
    mk('fuori', '2026-11-16', 'planned'),
  ]

  it('solo le sedute da lunedì a domenica', () => {
    const week = sessionsInWeek(sessions, '2026-11-09')
    expect(week.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd'])
  })
  it('riepilogo: le saltate non contano nelle ore pianificate', () => {
    const week = sessionsInWeek(sessions, '2026-11-09')
    const sum = summarize(week, '2026-11-14')
    expect(sum.plannedS).toBe(3 * 3600)
    expect(sum.doneS).toBe(3300)
    expect(sum.doneCount).toBe(1)
    expect(sum.totalCount).toBe(4)
    // dovute fino a oggi: a (fatta), b (saltata), c (da fare)
    expect(sum.adherencePct).toBe(33)
  })
  it('carico per disciplina', () => {
    const load = loadByDiscipline(sessionsInWeek(sessions, '2026-11-09'))
    expect(load.bike).toEqual({ plannedS: 3 * 3600, actualS: 3300 })
    expect(load.run).toEqual({ plannedS: 0, actualS: 0 })
  })
})
