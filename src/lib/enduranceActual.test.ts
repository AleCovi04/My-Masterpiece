import { describe, expect, it } from 'vitest'
import type { BrickSession, EnduranceSession, Session } from '../data/types'
import {
  averageIntensity,
  brickActual,
  brickActualTotals,
  clearSessionActual,
  deviationPct,
  enduranceActual,
  metricsDraft,
  parseMetrics,
  setSessionActual,
} from './enduranceActual'
import { actualSeconds, loadByDiscipline } from './weekStats'

const now = '2026-11-17T10:00:00.000Z'
const run: EnduranceSession = {
  id: 'r',
  createdAt: now,
  updatedAt: now,
  date: '2026-11-17',
  order: 0,
  status: 'planned',
  discipline: 'run',
  plan: { mode: 'simple', simple: { goal: 'time', durationS: 3000 } },
}
const brick: BrickSession = {
  id: 'b',
  createdAt: now,
  updatedAt: now,
  date: '2026-11-17',
  order: 1,
  status: 'planned',
  discipline: 'brick',
  plan: {
    legs: [
      {
        id: 'l1',
        discipline: 'bike',
        mode: 'simple',
        simple: { goal: 'time', durationS: 3600 },
      },
      {
        id: 'l2',
        discipline: 'run',
        mode: 'simple',
        simple: { goal: 'time', durationS: 1200 },
      },
    ],
  },
}

describe('modulo dell’eseguito', () => {
  it('tempo obbligatorio, il resto facoltativo', () => {
    const empty = parseMetrics('run', metricsDraft('run'))
    expect(empty.metrics).toBeNull()
    expect(empty.errors.time).toBe(true)
    const ok = parseMetrics('run', {
      ...metricsDraft('run'),
      time: '52:30',
      dist: '10,2',
      avgHr: '148',
      maxHr: '171',
      elev: '85',
    })
    expect(ok.metrics).toEqual({
      durationS: 3150,
      distanceM: 10200,
      avgHr: 148,
      maxHr: 171,
      elevationGainM: 85,
    })
  })

  it('valori non validi: FC fuori scala, max sotto la media, distanza', () => {
    const r = parseMetrics('bike', {
      ...metricsDraft('bike'),
      time: '1:00:00',
      dist: 'abc',
      avgHr: '160',
      maxHr: '150',
      elev: '-3',
    })
    expect(r.metrics).toBeNull()
    expect(r.errors).toEqual({ dist: true, maxHr: true, elev: true })
    expect(
      parseMetrics('run', { ...metricsDraft('run'), time: '30', avgHr: '20' })
        .errors,
    ).toEqual({ avgHr: true })
  })

  it('nuoto senza dislivello; il modulo si riempie dall’eseguito salvato', () => {
    const r = parseMetrics('swim', {
      ...metricsDraft('swim'),
      time: '40:00',
      dist: '2000',
      elev: 'xx',
    })
    expect(r.metrics).toEqual({ durationS: 2400, distanceM: 2000 })
    const back = metricsDraft('run', { durationS: 3150, distanceM: 10200 })
    expect(back).toMatchObject({ time: '52:30', dist: '10.2', unit: 'km' })
  })
})

describe('valori calcolati', () => {
  it('passo e velocità medi', () => {
    expect(averageIntensity('run', { durationS: 3000, distanceM: 10000 })).toBe(
      300,
    )
    expect(averageIntensity('swim', { durationS: 1800, distanceM: 1500 })).toBe(
      120,
    )
    expect(
      averageIntensity('bike', { durationS: 3600, distanceM: 32500 }),
    ).toBe(32.5)
    expect(averageIntensity('run', { durationS: 3000 })).toBeNull()
  })

  it('scostamento dal piano', () => {
    expect(deviationPct(3150, 3000)).toBe(5)
    expect(deviationPct(2850, 3000)).toBe(-5)
    expect(deviationPct(3000, null)).toBeNull()
  })

  it('brick: totali con transizioni; la transizione della prima frazione non si salva', () => {
    const a = brickActual(
      [
        {
          legId: 'l1',
          discipline: 'bike',
          durationS: 3700,
          distanceM: 35000,
          transitionBeforeS: 99,
        },
        {
          legId: 'l2',
          discipline: 'run',
          durationS: 1250,
          transitionBeforeS: 150,
        },
      ],
      7,
      '  gambe dure ',
    )
    expect(a.legs[0].transitionBeforeS).toBeUndefined()
    expect(a).toMatchObject({ rpe: 7, notes: 'gambe dure', source: 'manual' })
    expect(brickActualTotals(a)).toEqual({
      durationS: 3700 + 150 + 1250,
      transitionsS: 150,
      distanceBySport: { bike: 35000 },
    })
  })
})

describe('sedute', () => {
  it('salvare l’eseguito completa la seduta, eliminarlo la riporta programmata', () => {
    const a = enduranceActual('run', { durationS: 3150 }, null, '')
    expect(a).toEqual({
      discipline: 'run',
      source: 'manual',
      durationS: 3150,
      laps: [],
    })
    const done = setSessionActual([run, brick], 'r', a, now)
    expect(done[0]).toMatchObject({ status: 'done', actual: a })
    expect(done[1]).toBe(brick)
    expect(actualSeconds(done[0])).toBe(3150)
    // disciplina diversa: non si applica
    expect(
      setSessionActual([run], 'r', { ...a, discipline: 'bike' }, now)[0],
    ).toBe(run)
    const [back] = clearSessionActual(done, 'r', now)
    expect(back.status).toBe('planned')
    expect('actual' in back).toBe(false)
  })

  it('Panoramica: il brick eseguito si divide tra gli sport delle frazioni', () => {
    const a = brickActual(
      [
        { legId: 'l1', discipline: 'bike', durationS: 3700 },
        {
          legId: 'l2',
          discipline: 'run',
          durationS: 1250,
          transitionBeforeS: 150,
        },
      ],
      null,
      '',
    )
    const sessions: Session[] = setSessionActual([brick], 'b', a, now)
    expect(actualSeconds(sessions[0])).toBe(5100)
    const load = loadByDiscipline(sessions)
    expect(load.bike.actualS).toBe(3700)
    expect(load.run.actualS).toBe(1400)
  })
})
