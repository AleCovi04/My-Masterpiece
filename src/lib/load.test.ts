import { describe, expect, it } from 'vitest'
import type { BrickSession, Session } from '../data/types'
import { addDays, parseIsoDate, toIsoDate } from './dates'
import {
  acwrZone,
  fitnessFatigue,
  freshnessZone,
  loadBySport,
  loadStatus,
  missingRpe,
  sessionLoad,
  setSessionRpe,
  totalLoad,
  trendOf,
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
  it('minuti × RPE; senza RPE non conta; solo le svolte', () => {
    expect(sessionLoad(run('a', '2026-11-10', 'done', 60, 7))).toEqual({
      run: 420,
    })
    expect(sessionLoad(run('b', '2026-11-10', 'done', 40))).toEqual({})
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
    expect(l.run).toBe(420 + 168)
    expect(totalLoad(l)).toBe(420 + 648)
    expect(missingRpe(list).map((s) => s.id)).toEqual(['b'])
    expect(missingRpe([run('c', '2026-11-10', 'planned', 40)])).toEqual([])
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

const day = (start: string, i: number) =>
  toIsoDate(addDays(parseIsoDate(start), i))

/** Una corsa al giorno da `start` per `days` giorni, `min` minuti a RPE 5. */
const daily = (start: string, days: number, min: number, from = 0) =>
  Array.from({ length: days }, (_, i) =>
    run(`d${from + i}`, day(start, from + i), 'done', min, 5),
  )

describe('zone e tendenza', () => {
  it('ACWR', () => {
    expect(acwrZone(0.5)).toBe('low')
    expect(acwrZone(0.8)).toBe('safe')
    expect(acwrZone(1.29)).toBe('safe')
    expect(acwrZone(1.3)).toBe('caution')
    expect(acwrZone(1.5)).toBe('high')
  })

  it('Freschezza', () => {
    expect(freshnessZone(12)).toBe('fresh')
    expect(freshnessZone(5)).toBe('neutral')
    expect(freshnessZone(-10)).toBe('productive')
    expect(freshnessZone(-29)).toBe('productive')
    expect(freshnessZone(-30)).toBe('overload')
  })

  it('tendenza della Forma', () => {
    expect(trendOf(110, 100)).toBe('up')
    expect(trendOf(103, 100)).toBe('flat')
    expect(trendOf(90, 100)).toBe('down')
    expect(trendOf(5, 0)).toBe('up')
    expect(trendOf(0, 0)).toBe('flat')
  })
})

describe('loadStatus', () => {
  it('meno di 4 settimane: dati insufficienti', () => {
    const st = loadStatus(daily('2026-10-01', 27, 30), '2026-10-27')
    expect(st).toEqual({ enough: false, historyDays: 27 })
    expect(loadStatus([], '2026-10-27').enough).toBe(false)
  })

  it('carico costante: ACWR 1, tendenza in crescita all inizio', () => {
    const st = loadStatus(daily('2026-10-01', 28, 30), '2026-10-28')
    if (!st.enough) throw new Error('attesi dati')
    expect(st.acute).toBe(7 * 150)
    expect(st.chronicWeekly).toBe(7 * 150)
    expect(st.acwr).toBeCloseTo(1)
    expect(st.freshnessPct).toBeLessThan(0)
    expect(st.trend).toBe('up')
  })

  it('settimana raddoppiata: ACWR sopra 1,5 → troppo brusco', () => {
    const list = [
      ...daily('2026-10-01', 21, 30),
      ...daily('2026-10-01', 7, 60, 21),
    ]
    const st = loadStatus(list, '2026-10-28')
    if (!st.enough) throw new Error('attesi dati')
    // acuto 2100, cronico (3×1050 + 2100)/4 = 1312,5
    expect(st.acwr).toBeCloseTo(2100 / 1312.5)
    expect(acwrZone(st.acwr!)).toBe('high')
  })

  it('le sedute dopo il riferimento non contano', () => {
    const list = daily('2026-10-01', 40, 30)
    const st = loadStatus(list, '2026-10-28')
    if (!st.enough) throw new Error('attesi dati')
    expect(st.acute).toBe(7 * 150)
  })

  it('stop di due settimane: Forma in calo e fresco', () => {
    const st = loadStatus(daily('2026-08-01', 60, 60), '2026-10-14')
    if (!st.enough) throw new Error('attesi dati')
    expect(st.trend).toBe('down')
    expect(st.acwr).toBeLessThan(0.8)
    expect(freshnessZone(st.freshnessPct!)).toBe('fresh')
  })
})

describe('setSessionRpe', () => {
  it('solo sulle sedute svolte, arrotondato e in scala', () => {
    const list = [
      run('a', '2026-11-10', 'done', 40),
      run('b', '2026-11-11', 'planned', 40),
    ]
    const now = '2026-11-12T00:00:00.000Z'
    const out = setSessionRpe(list, 'a', 6.6, now)
    expect(out[0].actual?.rpe).toBe(7)
    expect(out[0].updatedAt).toBe(now)
    expect(setSessionRpe(list, 'b', 6, now)[1]).toBe(list[1])
    expect(setSessionRpe(list, 'a', 11, now)).toBe(list)
  })
})
