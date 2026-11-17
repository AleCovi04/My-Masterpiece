import { describe, expect, it } from 'vitest'
import type { BrickSession, EnduranceSession, Session } from '../data/types'
import {
  bucketsOf,
  distanceBySport,
  granularityOf,
  niceMax,
  resolveRange,
  sumTime,
  timeSeries,
} from './analysis'

const now = '2026-11-01T00:00:00.000Z'
const base = { createdAt: now, updatedAt: now, order: 0 }

function run(
  id: string,
  date: string,
  status: Session['status'],
  km: number,
  doneKm?: number,
): EnduranceSession {
  return {
    ...base,
    id,
    date,
    status,
    discipline: 'run',
    plan: {
      mode: 'simple',
      simple: { goal: 'distance', distanceM: km * 1000, intensity: 300 },
    },
    ...(doneKm !== undefined && {
      actual: {
        discipline: 'run',
        source: 'manual',
        durationS: doneKm * 300,
        distanceM: doneKm * 1000,
        laps: [],
      },
    }),
  }
}

const brick: BrickSession = {
  ...base,
  id: 'b',
  date: '2026-11-11',
  status: 'done',
  discipline: 'brick',
  plan: {
    legs: [
      {
        id: 'l1',
        discipline: 'bike',
        mode: 'simple',
        simple: { goal: 'distance', distanceM: 40000, intensity: 30 },
      },
      {
        id: 'l2',
        discipline: 'run',
        mode: 'simple',
        simple: { goal: 'distance', distanceM: 10000, intensity: 300 },
        transitionBeforeS: 120,
      },
    ],
  },
  actual: {
    discipline: 'brick',
    source: 'manual',
    legs: [
      { legId: 'l1', discipline: 'bike', durationS: 4800, distanceM: 41000 },
      {
        legId: 'l2',
        discipline: 'run',
        durationS: 3000,
        distanceM: 9500,
        transitionBeforeS: 150,
      },
    ],
  },
}

describe('resolveRange', () => {
  const today = '2026-11-18' // mercoledì
  it('ultime N settimane: da N−1 lunedì fa alla domenica corrente', () => {
    expect(resolveRange({ kind: 'weeks', weeks: 4 }, [], today)).toEqual({
      start: '2026-10-26',
      end: '2026-11-22',
    })
  })
  it('tutto: dalla prima seduta all’ultima, almeno fino a oggi', () => {
    const list = [
      run('a', '2026-10-07', 'done', 5),
      run('b', '2026-12-03', 'planned', 5),
    ]
    expect(resolveRange({ kind: 'all' }, list, today)).toEqual({
      start: '2026-10-05',
      end: '2026-12-06',
    })
    expect(resolveRange({ kind: 'all' }, [], today)).toEqual({
      start: '2026-11-16',
      end: '2026-11-22',
    })
  })
  it('fase o blocco: le sue date', () => {
    expect(
      resolveRange(
        { kind: 'range', start: '2026-09-07', end: '2026-10-04' },
        [],
        today,
      ),
    ).toEqual({ start: '2026-09-07', end: '2026-10-04' })
  })
})

describe('bucketsOf', () => {
  it('fino a 28 giorni per giorno, oltre per settimana', () => {
    const r4 = { start: '2026-10-26', end: '2026-11-22' }
    expect(granularityOf(r4)).toBe('day')
    expect(bucketsOf(r4)).toHaveLength(28)
    const r5 = { start: '2026-10-19', end: '2026-11-22' }
    expect(granularityOf(r5)).toBe('week')
    const b = bucketsOf(r5)
    expect(b).toHaveLength(5)
    expect(b[0]).toEqual({ start: '2026-10-19', end: '2026-10-25' })
  })
})

describe('volumi', () => {
  const list: Session[] = [
    run('a', '2026-11-09', 'done', 10, 12),
    run('c', '2026-11-10', 'skipped', 8),
    run('d', '2026-11-12', 'planned', 6),
    brick,
  ]

  it('distanza: saltate fuori dal previsto, eseguito solo dalle svolte, brick per frazione', () => {
    const d = distanceBySport(list)
    expect(d.run).toEqual({
      plannedM: 10000 + 6000 + 10000,
      actualM: 12000 + 9500,
    })
    expect(d.bike).toEqual({ plannedM: 40000, actualM: 41000 })
    expect(d.swim).toEqual({ plannedM: 0, actualM: 0 })
  })

  it('ore per intervallo e somma', () => {
    const buckets = bucketsOf(
      { start: '2026-11-09', end: '2026-11-15' },
      'week',
    )
    const series = timeSeries(list, buckets)
    expect(series).toHaveLength(1)
    const tot = sumTime(series)
    expect(tot.run.actualS).toBe(3600 + 3000 + 150)
    expect(tot.bike.actualS).toBe(4800)
    expect(tot.run.plannedS).toBe(3000 + 1800 + 3000 + 120)
  })
})

describe('niceMax', () => {
  it('arrotonda a 1, 2, 2.5 o 5 × 10ⁿ', () => {
    expect(niceMax(0)).toEqual({ max: 1, step: 0.25 })
    expect(niceMax(7.3)).toEqual({ max: 8, step: 2 })
    expect(niceMax(42)).toEqual({ max: 60, step: 20 })
    expect(niceMax(9)).toEqual({ max: 10, step: 2.5 })
  })
})
