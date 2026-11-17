import { describe, expect, it } from 'vitest'
import type { BlockApplication, EnduranceSession, Session } from '../data/types'
import { buildPlan, progressOf, raceInfo } from './plan'
import { emptySession } from './sessions'

const now = '2026-11-17T08:00:00.000Z'

const app = (
  id: string,
  start: string,
  weeks: [string, number, number][],
): BlockApplication => ({
  id,
  createdAt: now,
  updatedAt: now,
  kind: 'phase',
  sourceId: 'ph',
  name: id,
  startDate: start,
  weeks: weeks.map(([blockId, week, total], i) => {
    const d = new Date(`${start}T12:00:00`)
    d.setDate(d.getDate() + i * 7)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return { start: iso, blockId, blockName: blockId, week, weeks: total }
  }),
})

const ses = (
  id: string,
  date: string,
  status: Session['status'],
  appId = 'base',
): Session => {
  const base = emptySession('run', date, now, id) as EnduranceSession
  return {
    ...base,
    status,
    applicationId: appId,
    estimatedDurationSec: 3600,
    ...(status === 'done' && {
      actual: {
        discipline: 'run',
        source: 'manual',
        durationS: 3000,
        laps: [],
      },
    }),
  }
}

describe('Il Piano', () => {
  it('andamento: svolte su totali, saltate a parte, ore', () => {
    const p = progressOf([
      ses('a', '2026-11-23', 'done'),
      ses('b', '2026-11-24', 'skipped'),
      ses('c', '2026-11-25', 'planned'),
    ])
    expect(p).toEqual({
      total: 3,
      done: 1,
      skipped: 1,
      plannedS: 7200,
      doneS: 3000,
      pct: 33,
    })
    expect(progressOf([]).pct).toBe(0)
  })

  it('fase: gruppi per blocco (anche ripetuto), settimane e stato', () => {
    const base = app('base', '2026-11-16', [
      ['carico', 1, 2],
      ['carico', 2, 2],
      ['carico', 1, 2],
      ['carico', 2, 2],
      ['scarico', 1, 1],
    ])
    const sessions = [
      ses('a', '2026-11-16', 'done'),
      ses('b', '2026-11-18', 'planned'),
      ses('c', '2026-11-25', 'planned'),
      ses('altro', '2026-11-16', 'done', 'altra'),
      // spostata fuori dalle settimane: conta solo nel totale della fase
      ses('spostata', '2027-01-04', 'done'),
    ]
    const [item] = buildPlan([base], sessions, '2026-11-17')
    expect(item.runs.map((r) => [r.blockName, r.weeks.length])).toEqual([
      ['carico', 2],
      ['carico', 2],
      ['scarico', 1],
    ])
    expect(item.end).toBe('2026-12-20')
    expect(item.timing).toBe('current')
    expect(item.runs[0].weeks[0]).toMatchObject({
      index: 1,
      week: 1,
      timing: 'current',
      progress: { total: 2, done: 1 },
    })
    expect(item.runs[1].timing).toBe('future')
    expect(item.progress).toMatchObject({ total: 4, done: 2, pct: 50 })
  })

  it('ordine per data e settimane scoperte fino alla gara', () => {
    const later = app('dopo', '2026-12-07', [['b', 1, 1]])
    const first = app('prima', '2026-11-23', [['a', 1, 1]])
    const items = buildPlan([later, first], [], '2026-11-17')
    expect(items.map((i) => i.application.id)).toEqual(['prima', 'dopo'])
    // settimane del 16/11, 23/11, 30/11, 7/12, 14/12 (la gara è mercoledì 23/12): 5, di cui 2 coperte
    expect(raceInfo(items, '2026-11-17', '2026-12-23')).toEqual({
      weeksToRace: 5,
      uncovered: 3,
    })
    expect(raceInfo(items, '2026-11-17', null)).toBeNull()
    expect(raceInfo(items, '2026-11-17', '2026-01-01')).toBeNull()
  })
})
