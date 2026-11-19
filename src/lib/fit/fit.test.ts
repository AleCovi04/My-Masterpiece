import { Encoder, Profile } from '@garmin/fitsdk'
import { gzipSync, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import {
  bestPowerEfforts,
  bestRunEfforts,
  hrZoneBounds,
  movingTime,
  normalizedPower,
  powerZoneBounds,
  series,
  splits,
  timeInZones,
} from './analysis'
import { extractFitFiles, readFit } from './decode'
import type { FitPoint } from './types'

const T0 = new Date('2026-11-10T07:00:00Z').getTime()
const at = (s: number) => new Date(T0 + s * 1000)

interface Part {
  sport: string
  subSport?: string
  seconds: number
  speed: number
  extra?: Record<string, unknown>
}

/** FIT di prova: una frazione per parte, un campione al secondo, 3 m/s di default. */
function makeFit(parts: Part[], fileSport = 'activity'): Uint8Array {
  const e = new Encoder()
  const write = e.onMesg.bind(e) as (
    num: number,
    mesg: Record<string, unknown>,
  ) => void
  write(Profile.MesgNum.FILE_ID, {
    manufacturer: 'garmin',
    product: 1,
    serialNumber: 42,
    timeCreated: at(0),
    type: fileSport,
  })
  let t = 0
  parts.forEach((part, index) => {
    const start = t
    let dist = 0
    if (part.sport !== 'transition')
      for (let i = 0; i < part.seconds; i++) {
        write(Profile.MesgNum.RECORD, {
          timestamp: at(t + i),
          positionLat: 543000000 + i * 1000,
          positionLong: 100000000,
          distance: dist,
          enhancedSpeed: part.speed,
          enhancedAltitude: 100 + (i % 10),
          heartRate: 120 + (i % 40),
          cadence: 85,
          power: part.sport === 'cycling' ? 200 + (i % 2) * 100 : undefined,
        })
        dist += part.speed
      }
    t += part.seconds
    write(Profile.MesgNum.LAP, {
      timestamp: at(t),
      startTime: at(start),
      totalElapsedTime: part.seconds,
      totalTimerTime: part.seconds,
      totalDistance: dist,
      avgHeartRate: 140,
      sport: part.sport,
    })
    write(Profile.MesgNum.SESSION, {
      timestamp: at(t),
      startTime: at(start),
      totalElapsedTime: part.seconds,
      totalTimerTime: part.seconds,
      totalDistance: dist,
      sport: part.sport,
      subSport: part.subSport ?? 'generic',
      avgHeartRate: 140,
      maxHeartRate: 159,
      enhancedAvgSpeed: part.speed,
      totalAscent: 12,
      avgCadence: 85,
      totalCalories: 300,
      ...part.extra,
    })
    write(Profile.MesgNum.TIME_IN_ZONE, {
      referenceMesg: 'session',
      referenceIndex: index,
      timeInHrZone: [10, 20, 30],
      hrZoneHighBoundary: [130, 150],
    })
  })
  return e.close()
}

describe('readFit', () => {
  it('legge una corsa: riepilogo, giri, campioni, zone dell’orologio', async () => {
    const act = await readFit(
      makeFit([{ sport: 'running', seconds: 600, speed: 3 }]),
    )
    expect(act).not.toBeNull()
    const s = act!.sessions[0]
    expect(act!.key).toBe(`42-${T0 / 1000}`)
    expect(s.discipline).toBe('run')
    expect(s.timerS).toBe(600)
    expect(s.distanceM).toBe(1800)
    expect(s.avgCadence).toBe(170) // passi al minuto
    expect(s.calories).toBe(300)
    expect(s.laps).toHaveLength(1)
    expect(s.hrZones).toEqual({ boundaries: [130, 150], seconds: [10, 20, 30] })
    expect(act!.points).toHaveLength(600)
    expect(act!.points[1].lat).toBeCloseTo(543001000 * (180 / 2 ** 31), 6)
    expect(act!.points[0].cad).toBe(170)
  })

  it('multisport: frazioni, transizioni, distanza relativa a ogni frazione', async () => {
    const act = await readFit(
      makeFit([
        { sport: 'swimming', subSport: 'openWater', seconds: 300, speed: 1 },
        { sport: 'transition', seconds: 90, speed: 0 },
        { sport: 'cycling', seconds: 600, speed: 8 },
        { sport: 'transition', seconds: 60, speed: 0 },
        { sport: 'running', seconds: 300, speed: 3 },
      ]),
    )
    expect(act!.sessions.map((s) => s.discipline)).toEqual([
      'swim',
      'bike',
      'run',
    ])
    expect(act!.sessions[0].subSport).toBe('openWater')
    expect(act!.transitions).toEqual([
      { afterSession: 0, durationS: 90 },
      { afterSession: 1, durationS: 60 },
    ])
    const bike = act!.sessions[1]
    expect(bike.startS).toBe(390)
    expect(act!.points[bike.pointStart].d).toBe(0)
    expect(bike.pointEnd - bike.pointStart).toBe(600)
  })

  it('attività non di corsa, bici o nuoto → null', async () => {
    expect(
      await readFit(makeFit([{ sport: 'training', seconds: 60, speed: 0 }])),
    ).toBeNull()
  })

  it('file non FIT → errore', async () => {
    await expect(readFit(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow()
  })
})

describe('extractFitFiles', () => {
  it('zip (solo i .fit) e gzip', () => {
    const fit = makeFit([{ sport: 'running', seconds: 10, speed: 3 }])
    const zip = zipSync({ 'a.fit': fit, 'leggimi.txt': new Uint8Array([65]) })
    expect(extractFitFiles(zip)).toHaveLength(1)
    expect(extractFitFiles(gzipSync(fit))[0]).toEqual(fit)
    expect(extractFitFiles(fit)[0]).toBe(fit)
  })
})

const run = (n: number, v = 4, step = 1): FitPoint[] =>
  Array.from({ length: n }, (_, i) => ({
    t: i * step,
    d: i * step * v,
    v,
    hr: i < n / 2 ? 120 : 160,
    alt: 100 + i,
  }))

describe('analisi', () => {
  it('tempo in movimento: le pause e i fermi non contano', () => {
    const pts = [
      ...run(11),
      { t: 100, d: 40, v: 4 }, // pausa di 90 s
      { t: 101, d: 44, v: 4 },
      { t: 102, d: 44, v: 0 }, // fermo
    ]
    expect(movingTime(pts)).toBe(11)
  })

  it('parziali al km, con l’ultimo più corto', () => {
    const s = splits(run(626), 1000) // 2500 m a 4 m/s
    expect(s.map((x) => x.distanceM)).toEqual([1000, 1000, 500])
    expect(s[0].durationS).toBe(250)
    expect(s[0].avgHr).toBe(120)
  })

  it('zone: limiti dalla FC massima (e riserva) e dall’FTP; secondi per zona', () => {
    expect(hrZoneBounds(200)).toEqual([120, 140, 160, 180])
    expect(hrZoneBounds(200, 50)).toEqual([140, 155, 170, 185])
    expect(powerZoneBounds(200)).toEqual([110, 150, 180, 210, 240, 300])
    expect(timeInZones(run(101), 'hr', [130, 150])).toEqual([50, 0, 50])
  })

  it('potenza normalizzata e migliori potenze', () => {
    const pts: FitPoint[] = Array.from({ length: 121 }, (_, i) => ({
      t: i,
      pw: i % 2 ? 300 : 100,
    }))
    const np = normalizedPower(pts)!
    expect(np).toBeGreaterThanOrEqual(199)
    expect(np).toBeLessThanOrEqual(201)
    expect(normalizedPower(pts.map((p) => ({ ...p, pw: 250 })))).toBe(250)
    const best = bestPowerEfforts(pts)
    expect(best[0]).toEqual({ target: 5, value: 220 })
    expect(best[1].target).toBe(60)
  })

  it('migliori prestazioni di corsa', () => {
    const best = bestRunEfforts(run(1301)) // 5200 m a 4 m/s
    expect(best).toEqual([
      { target: 400, value: 100 },
      { target: 1000, value: 250 },
      { target: 5000, value: 1250 },
    ])
  })

  it('serie per i grafici: passo, ridotta, sull’asse della distanza', () => {
    const s = series(run(1000), 'pace', 'distance', 100)
    expect(s.length).toBeLessThanOrEqual(100)
    expect(s[0].y).toBe(250)
    expect(s[1].x).toBeGreaterThan(s[0].x)
  })
})
