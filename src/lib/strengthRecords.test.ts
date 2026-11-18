import { describe, expect, it } from 'vitest'
import type { Session } from '../data/types'
import {
  allHistories,
  bestValues,
  exerciseHistory,
  exerciseRecords,
  exerciseSummary,
  latestRecords,
  newRecords,
  recordHits,
  sessionStats,
} from './strengthRecords'

const now = '2026-11-01T00:00:00.000Z'
const sess = (
  id: string,
  date: string,
  items: { id: string; sets: [number, number][]; skipped?: boolean }[],
  status: Session['status'] = 'done',
): Session => ({
  id,
  createdAt: now,
  updatedAt: now,
  date,
  order: 0,
  status,
  discipline: 'strength',
  plan: { entries: [] },
  actual: {
    discipline: 'strength',
    startedAt: `${date}T18:00:00.000Z`,
    exercises: items.map((it) => ({
      exerciseId: it.id,
      skipped: !!it.skipped,
      sets: it.sets.map(([kg, reps]) => ({ kg, reps, completedAt: now })),
    })),
  },
})

describe('metriche di una seduta', () => {
  it('peso massimo, record a N ripetizioni (almeno N), volume in serie e in seduta', () => {
    const s = sessionStats([
      { kg: 36, reps: 4 },
      { kg: 30, reps: 8 },
      { kg: 36, reps: 5 },
    ])
    expect(s.values.maxKg).toBe(36)
    // a pari kg conta la prima serie
    expect(s.sets.maxKg).toEqual({ kg: 36, reps: 4 })
    expect(s.values.r1).toBe(36)
    expect(s.values.r4).toBe(36)
    // 36 × 5 non arriva a 6 reps: per N = 6 vale 30 × 8
    expect(s.values.r6).toBe(30)
    expect(s.values.r8).toBe(30)
    expect(s.values.r10).toBeNull()
    // 30 × 8 = 240 batte 36 × 5 = 180 e 36 × 4 = 144
    expect(s.values.setVolume).toBe(240)
    expect(s.sets.setVolume).toEqual({ kg: 30, reps: 8 })
    expect(s.values.sessionVolume).toBe(144 + 240 + 180)
    expect(s.count).toBe(3)
  })

  it('nessuna serie: tutto vuoto', () => {
    expect(sessionStats([]).values.maxKg).toBeNull()
    expect(sessionStats([]).values.sessionVolume).toBeNull()
  })
})

const list: Session[] = [
  sess('a', '2026-10-01', [
    {
      id: 'curl',
      sets: [
        [36, 4],
        [30, 8],
      ],
    },
  ]),
  sess('x', '2026-10-03', [{ id: 'curl', sets: [[99, 9]] }], 'skipped'),
  sess('b', '2026-10-05', [
    {
      id: 'curl',
      sets: [
        [34, 6],
        [34, 6],
        [32, 8],
      ],
    },
  ]),
  sess('c', '2026-10-08', [
    { id: 'curl', sets: [[38, 2]] },
    { id: 'curl', sets: [[28, 12]] },
  ]),
  sess('d', '2026-10-10', [{ id: 'curl', sets: [[50, 5]], skipped: true }]),
]

describe('storico e record', () => {
  const h = exerciseHistory(list, 'curl')

  it('una voce per seduta svolta, saltati esclusi', () => {
    expect(h.map((x) => x.sessionId)).toEqual(['a', 'b', 'c'])
    // due voci dello stesso esercizio nella seduta si sommano
    expect(h[2].stats.count).toBe(2)
  })

  it('la prima seduta non è un record; dopo, solo ciò che supera lo storico', () => {
    expect(h[0].records).toEqual([])
    // b: 34 × 6 batte 30 per N = 6; 32 × 8 batte 30 × 8 (anche in volume: 256 > 240); seduta 664 > 384
    expect(h[1].records).toEqual(['r6', 'r8', 'setVolume', 'sessionVolume'])
    // c: 38 kg nuovo massimo (anche N = 1); 28 × 12 è la prima serie da 10 e 12 reps: niente record
    expect(h[2].records).toEqual(['maxKg', 'r1', 'setVolume'])
  })

  it('record dello storico con la data in cui sono stati fatti', () => {
    const r = exerciseRecords(h)
    expect(r.maxKg).toEqual({
      value: 38,
      date: '2026-10-08',
      set: { kg: 38, reps: 2 },
    })
    expect(r.r4).toEqual({
      value: 36,
      date: '2026-10-01',
      set: { kg: 36, reps: 4 },
    })
    expect(r.r6?.value).toBe(34)
    expect(r.r10).toEqual({
      value: 28,
      date: '2026-10-08',
      set: { kg: 28, reps: 12 },
    })
    expect(r.setVolume?.value).toBe(336)
    expect(r.sessionVolume).toEqual({ value: 664, date: '2026-10-05' })
  })

  it('recordHits: solo valori strettamente più alti di un precedente', () => {
    const best = bestValues(h)
    const hits = recordHits(
      best,
      sessionStats([
        { kg: 38, reps: 4 },
        { kg: 20, reps: 15 },
      ]),
    )
    expect(hits).toEqual([
      { metric: 'r4', value: 38, previous: 36, set: { kg: 38, reps: 4 } },
    ])
  })
})

describe('nuovi record a fine allenamento', () => {
  it('confronto con tutto lo storico precedente; esercizio mai fatto: nessun record', () => {
    const out = newRecords(list, [
      { exerciseId: 'curl', sets: [{ kg: 40, reps: 3 }] },
      { exerciseId: 'curl', sets: [{ kg: 30, reps: 12 }] },
      { exerciseId: 'nuovo', sets: [{ kg: 100, reps: 10 }] },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].exerciseId).toBe('curl')
    expect(out[0].hits.map((x) => x.metric)).toEqual([
      'maxKg',
      'r10',
      'r12',
      'setVolume',
    ])
    expect(out[0].hits[0]).toMatchObject({ value: 40, previous: 38 })
  })
})

describe('storici, riepiloghi e ultimi record', () => {
  const sessions = [
    sess('a', '2026-10-01', [
      { id: 'panca', sets: [[60, 8]] },
      { id: 'squat', sets: [[80, 5]] },
    ]),
    sess('b', '2026-10-08', [
      { id: 'panca', sets: [[62.5, 8]] },
      { id: 'squat', sets: [[80, 5]] },
    ]),
    sess('c', '2026-10-15', [{ id: 'squat', sets: [[85, 6]] }]),
    sess('d', '2026-10-22', [{ id: 'panca', sets: [[50, 10]] }]),
  ]
  const histories = allHistories(sessions)

  it('allHistories coincide con exerciseHistory per ogni esercizio', () => {
    expect(histories.get('panca')).toEqual(exerciseHistory(sessions, 'panca'))
    expect(histories.get('squat')?.map((h) => h.sessionId)).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('riepilogo: massimi di sempre, ultima volta e ultimo record', () => {
    expect(exerciseSummary(histories.get('panca') ?? [])).toEqual({
      maxKg: 62.5,
      setVolume: 500,
      lastDate: '2026-10-22',
      lastRecordDate: '2026-10-08', // il 22: prima volta con ≥ 10 rip., non è un record
    })
  })

  it('ultimi record dal più recente, uno per esercizio e seduta', () => {
    const r = latestRecords(histories)
    expect(r.map((x) => [x.exerciseId, x.date, x.metric])).toEqual([
      ['squat', '2026-10-15', 'maxKg'],
      ['panca', '2026-10-08', 'maxKg'],
    ])
    expect(r[0].others).toBe(3) // ≥ 4 rip., ≥ 6 rip., volume in serie e in seduta
    expect(latestRecords(histories, 1)).toHaveLength(1)
    expect(latestRecords(new Map())).toEqual([])
  })
})
