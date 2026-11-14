import { describe, expect, it } from 'vitest'
import { generateSampleSessions } from '../data/sampleData'
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

describe('dati di esempio', () => {
  const now = new Date(2026, 10, 14, 12) // sabato
  const sessions = generateSampleSessions(now)

  it('copre 12 settimane', () => {
    const dates = sessions.map((s) => s.date).sort()
    expect(dates[0] >= '2026-08-24').toBe(true) // lunedì di 11 settimane prima
    expect(dates.at(-1)).toBe('2026-11-15')
  })
  it('oggi ha un nuoto completato e una corsa da fare', () => {
    const today = sessions.filter((s) => s.date === '2026-11-14')
    expect(today.map((s) => [s.plan.discipline, s.status])).toEqual([
      ['swim', 'done'],
      ['run', 'planned'],
    ])
  })
  it('le sedute completate hanno actual coerente con la disciplina', () => {
    for (const s of sessions.filter((x) => x.status === 'done')) {
      expect(s.actual?.discipline).toBe(s.plan.discipline)
    }
  })
  it('riepilogo settimana', () => {
    const week = sessionsInWeek(sessions, '2026-11-09')
    const sum = summarize(week, '2026-11-14')
    expect(sum.totalCount).toBe(week.length)
    expect(sum.adherencePct).toBeGreaterThan(0)
    expect(sum.adherencePct).toBeLessThanOrEqual(100)
    const load = loadByDiscipline(week)
    expect(load.bike.plannedS).toBeGreaterThan(0)
  })
})
