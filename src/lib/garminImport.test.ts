import { describe, expect, it } from 'vitest'
import type { BrickSession, EnduranceSession, Session } from '../data/types'
import type { FitActivity, FitSession } from './fit/types'
import { activityDate, applyImport, importCandidates } from './garminImport'
import { emptySession } from './sessions'

const NOW = '2026-11-10T12:00:00.000Z'
const START = new Date(2026, 10, 10, 7, 0).toISOString() // ora locale

const fitSession = (
  discipline: FitSession['discipline'],
  extra: Partial<FitSession> = {},
): FitSession => ({
  discipline,
  startedAt: START,
  startS: 0,
  elapsedS: 3700,
  timerS: 3600,
  distanceM: 10000.4,
  avgHr: 150,
  maxHr: 175,
  ascentM: 80,
  calories: 700,
  avgCadence: 172,
  pointStart: 0,
  pointEnd: 2,
  laps: [{ startS: 0, durationS: 3600, elapsedS: 3700, distanceM: 10000 }],
  lengths: [],
  ...extra,
})

const activity = (sessions: FitSession[]): FitActivity => ({
  key: '42-100',
  startedAt: START,
  sessions,
  transitions: sessions.length > 1 ? [{ afterSession: 0, durationS: 95 }] : [],
  points: [
    { t: 0, lat: 45, lon: 9, v: 3 },
    { t: 1, lat: 45.0001, lon: 9, v: 3 },
  ],
})

const run = (id: string, extra: Partial<EnduranceSession> = {}) =>
  ({
    ...(emptySession('run', '2026-11-10', NOW, id) as EnduranceSession),
    ...extra,
  }) as Session

describe('import Garmin', () => {
  const act = activity([fitSession('run')])

  it('giorno locale dell’attività', () => {
    expect(activityDate(act)).toBe('2026-11-10')
  })

  it('candidati: stesso giorno e disciplina, non saltate né già importate', () => {
    const sessions: Session[] = [
      run('a'),
      run('b', { status: 'skipped' }),
      { ...run('c'), date: '2026-11-11' },
      emptySession('bike', '2026-11-10', NOW, 'd'),
      run('e', {
        status: 'done',
        actual: {
          discipline: 'run',
          source: 'garmin_fit',
          durationS: 60,
          laps: [],
        },
      }),
    ]
    expect(importCandidates(sessions, act).map((s) => s.id)).toEqual(['a'])
  })

  it('abbinata: seduta svolta con metriche estese e giri; RPE e note restano', () => {
    const prev = run('a', {
      status: 'done',
      actual: {
        discipline: 'run',
        source: 'manual',
        durationS: 100,
        rpe: 6,
        notes: 'gambe dure',
        laps: [],
      },
    })
    const out = applyImport([prev], act, 'a', 'file', NOW)
    const s = out.sessions[0] as EnduranceSession
    expect(out.created).toBe(false)
    expect(s.status).toBe('done')
    expect(s.actual).toMatchObject({
      source: 'garmin_fit',
      durationS: 3600,
      distanceM: 10000,
      elapsedS: 3700,
      calories: 700,
      avgCadence: 172,
      elevationGainM: 80,
      rpe: 6,
      notes: 'gambe dure',
      garmin: { activityId: '42-100', hasTrack: true },
    })
    expect(s.actual!.laps).toHaveLength(1)
    expect(out.record).toMatchObject({
      id: '42-100',
      source: 'file',
      sessionId: 'a',
    })
  })

  it('senza seduta: ne crea una non pianificata in fondo al giorno', () => {
    const out = applyImport([run('a')], act, null, 'intervals', NOW, {
      intervalsId: 'i9',
      newSessionId: 'n',
    })
    expect(out.created).toBe(true)
    const s = out.sessions.find((x) => x.id === 'n')!
    expect(s.order).toBe(1)
    expect(s.status).toBe('done')
    expect(out.record.intervalsId).toBe('i9')
  })

  it('multisport: brick con le stesse frazioni, transizioni reali', () => {
    const multi = activity([fitSession('bike'), fitSession('run')])
    const brick = emptySession('brick', '2026-11-10', NOW, 'b') as BrickSession
    const planned: BrickSession = {
      ...brick,
      plan: {
        legs: [
          {
            id: 'l1',
            discipline: 'bike',
            mode: 'simple',
            simple: { goal: 'distance' },
          },
          {
            id: 'l2',
            discipline: 'run',
            mode: 'simple',
            simple: { goal: 'distance' },
          },
        ],
      },
    }
    const other: BrickSession = {
      ...planned,
      id: 'x',
      plan: { legs: [...planned.plan.legs].reverse() },
    }
    expect(
      importCandidates([planned, other, run('r')], multi).map((s) => s.id),
    ).toEqual(['b'])
    const out = applyImport([planned], multi, 'b', 'file', NOW)
    const a = (out.sessions[0] as BrickSession).actual!
    expect(a.legs.map((l) => [l.legId, l.discipline])).toEqual([
      ['l1', 'bike'],
      ['l2', 'run'],
    ])
    expect(a.legs[0].transitionBeforeS).toBeUndefined()
    expect(a.legs[1].transitionBeforeS).toBe(95)

    const fresh = applyImport([], multi, null, 'file', NOW)
    const b = fresh.sessions[0] as BrickSession
    expect(b.plan.legs.map((l) => l.discipline)).toEqual(['bike', 'run'])
    expect(b.actual!.legs.map((l) => l.legId)).toEqual(
      b.plan.legs.map((l) => l.id),
    )
  })
})
