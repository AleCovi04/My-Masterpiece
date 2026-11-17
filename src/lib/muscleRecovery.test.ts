import { describe, expect, it } from 'vitest'
import type { Exercise, Session } from '../data/types'
import { parseIsoDate } from './dates'
import {
  FATIGUE_FULL,
  fatigueLevel,
  lastTrained,
  muscleFatigue,
  RECOVERY_TAU_H,
  sessionInstant,
} from './muscleRecovery'

const H = 3_600_000
const ex = (id: string, muscles: Exercise['muscles']) => ({ id, muscles })
const exercises = [
  ex('panca', [
    { muscle: 'chest', percent: 100 },
    { muscle: 'triceps', percent: 50 },
  ]),
  ex('squat', [{ muscle: 'quads', percent: 100 }]),
]

const sess = (
  id: string,
  date: string,
  items: { id: string; sets: number; skipped?: boolean }[],
  opts: {
    endedAt?: string
    completedAt?: string
    status?: Session['status']
  } = {},
): Session => ({
  id,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  date,
  order: 0,
  status: opts.status ?? 'done',
  discipline: 'strength',
  plan: { entries: [] },
  actual: {
    discipline: 'strength',
    startedAt: `${date}T17:00:00.000Z`,
    ...(opts.endedAt && { endedAt: opts.endedAt }),
    exercises: items.map((it) => ({
      exerciseId: it.id,
      skipped: !!it.skipped,
      sets: Array.from({ length: it.sets }, () => ({
        kg: 50,
        reps: 8,
        completedAt: opts.completedAt ?? 'non valida',
      })),
    })),
  },
})

describe('istante della seduta', () => {
  it('fine registrata, poi ultima serie, poi mezzogiorno', () => {
    const a = sess('a', '2026-11-10', [{ id: 'panca', sets: 1 }], {
      endedAt: '2026-11-10T19:00:00.000Z',
      completedAt: '2026-11-10T18:30:00.000Z',
    })
    const b = sess('b', '2026-11-10', [{ id: 'panca', sets: 1 }], {
      completedAt: '2026-11-10T18:30:00.000Z',
    })
    const c = sess('c', '2026-11-10', [{ id: 'panca', sets: 1 }])
    const at = (s: Session) =>
      s.discipline === 'strength' && s.actual
        ? sessionInstant(s.date, s.actual)
        : NaN
    expect(at(a)).toBe(Date.parse('2026-11-10T19:00:00.000Z'))
    expect(at(b)).toBe(Date.parse('2026-11-10T18:30:00.000Z'))
    expect(at(c)).toBe(parseIsoDate('2026-11-10').getTime() + 12 * H)
  })
})

describe('fatica per muscolo', () => {
  const end = '2026-11-10T19:00:00.000Z'
  const t0 = Date.parse(end)
  const list = [
    sess(
      'a',
      '2026-11-10',
      [
        { id: 'panca', sets: 4 },
        { id: 'squat', sets: 3, skipped: true },
      ],
      {
        endedAt: end,
      },
    ),
    // saltata: non conta
    sess('s', '2026-11-10', [{ id: 'squat', sets: 5 }], {
      endedAt: end,
      status: 'skipped',
    }),
    // nel futuro rispetto a "adesso": non conta
    sess('f', '2026-11-20', [{ id: 'squat', sets: 5 }], {
      endedAt: '2026-11-20T10:00:00.000Z',
    }),
  ]

  it('subito dopo: serie × % / 100', () => {
    const f = muscleFatigue(list, exercises, t0)
    expect(f.chest).toBeCloseTo(4)
    expect(f.triceps).toBeCloseTo(2)
    expect(f.quads).toBe(0)
  })

  it('decade con e^(−Δt/τ), τ = 48 h', () => {
    expect(RECOVERY_TAU_H).toBe(48)
    const f = muscleFatigue(list, exercises, t0 + 48 * H)
    expect(f.chest).toBeCloseTo(4 * Math.exp(-1))
    const g = muscleFatigue(list, exercises, t0 + 96 * H)
    expect(g.triceps).toBeCloseTo(2 * Math.exp(-2))
  })

  it('le sedute si sommano', () => {
    const two = [
      ...list,
      sess('b', '2026-11-11', [{ id: 'panca', sets: 2 }], {
        endedAt: '2026-11-11T19:00:00.000Z',
      }),
    ]
    const f = muscleFatigue(two, exercises, t0 + 24 * H)
    expect(f.chest).toBeCloseTo(4 * Math.exp(-0.5) + 2)
  })

  it('livello del colore: 0 se recuperato, 1 dal valore pieno in su', () => {
    expect(fatigueLevel(0.1)).toBe(0)
    expect(fatigueLevel(FATIGUE_FULL / 2)).toBeCloseTo(0.5)
    expect(fatigueLevel(FATIGUE_FULL * 3)).toBe(1)
  })

  it('ultima volta allenato con gli esercizi fatti', () => {
    const now = Date.parse('2026-11-15T00:00:00.000Z')
    const r = lastTrained(list, exercises, 'triceps', now)
    expect(r?.date).toBe('2026-11-10')
    expect(r?.exercises).toEqual([
      { exerciseId: 'panca', sets: 4, weighted: 2 },
    ])
    // squat solo saltato, in una seduta saltata o nel futuro
    expect(lastTrained(list, exercises, 'quads', now)).toBeNull()
  })
})
