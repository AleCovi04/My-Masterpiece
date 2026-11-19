import { describe, expect, it } from 'vitest'
import type { EnduranceSession, ImportRecord, Session } from '../data/types'
import {
  ignoredImportId,
  linkCandidates,
  proposeLinks,
  remoteDiscipline,
  type RemoteActivity,
} from './garminLink'
import { emptySession } from './sessions'

const NOW = '2026-11-10T12:00:00.000Z'

const session = (
  id: string,
  discipline: 'run' | 'bike' | 'swim',
  date: string,
  extra: Partial<EnduranceSession> = {},
) =>
  ({
    ...(emptySession(discipline, date, NOW, id) as EnduranceSession),
    ...extra,
  }) as Session

const remote = (
  id: string,
  type: string,
  startLocal: string,
  startUtc = `${startLocal}Z`,
): RemoteActivity => ({ id, type, startLocal, startUtc })

describe('collega attività di intervals.icu', () => {
  it('disciplina dal tipo', () => {
    expect(remoteDiscipline('Run')).toBe('run')
    expect(remoteDiscipline('VirtualRun')).toBe('run')
    expect(remoteDiscipline('VirtualRide')).toBe('bike')
    expect(remoteDiscipline('OpenWaterSwim')).toBe('swim')
    expect(remoteDiscipline('WeightTraining')).toBeNull()
    expect(remoteDiscipline(undefined)).toBeNull()
  })

  it('candidati: stesso giorno e sport, non saltati né già da Garmin, anche svolti a mano', () => {
    const sessions = [
      session('a', 'run', '2026-11-10', { order: 1 }),
      session('b', 'run', '2026-11-10', { status: 'skipped' }),
      session('c', 'bike', '2026-11-10'),
      session('d', 'run', '2026-11-11'),
      session('e', 'run', '2026-11-10', {
        status: 'done',
        actual: {
          discipline: 'run',
          source: 'garmin_fit',
          durationS: 60,
          laps: [],
        },
      }),
      session('f', 'run', '2026-11-10', {
        order: 0,
        status: 'done',
        actual: {
          discipline: 'run',
          source: 'manual',
          durationS: 60,
          laps: [],
        },
      }),
    ]
    expect(
      linkCandidates(sessions, '2026-11-10', 'run').map((s) => s.id),
    ).toEqual(['f', 'a'])
  })

  it('proposte: salta le già importate o ignorate, sedute diverse per attività diverse', () => {
    const sessions = [
      session('r1', 'run', '2026-11-10', { order: 0 }),
      session('r2', 'run', '2026-11-10', { order: 1 }),
    ]
    const imports: ImportRecord[] = [
      // importata da file: riconosciuta dall'ora d'inizio
      {
        id: '42-1',
        createdAt: NOW,
        updatedAt: NOW,
        source: 'file',
        startedAt: '2026-11-09T07:00:30.000Z',
      },
      {
        id: ignoredImportId('i5'),
        createdAt: NOW,
        updatedAt: NOW,
        source: 'intervals',
        intervalsId: 'i5',
        startedAt: '2026-11-08T07:00:00.000Z',
        ignored: true,
      },
    ]
    const out = proposeLinks(
      [
        remote('i3', 'Run', '2026-11-10T18:00:00'),
        remote('i2', 'Run', '2026-11-10T07:00:00'),
        remote('i4', 'Run', '2026-11-10T20:00:00'),
        remote('i1', 'Run', '2026-11-09T07:00:00'),
        remote('i5', 'Run', '2026-11-08T07:00:00'),
        remote('i6', 'WeightTraining', '2026-11-10T09:00:00'),
        remote('i7', 'Ride', '2026-11-10T10:00:00'),
      ],
      sessions,
      imports,
    )
    expect(out.map((p) => [p.activity.id, p.target])).toEqual([
      ['i2', 'r1'],
      ['i7', null],
      ['i3', 'r2'],
      ['i4', null],
    ])
    expect(out[3].candidates.map((s) => s.id)).toEqual(['r1', 'r2'])
    expect(out[0].date).toBe('2026-11-10')
  })
})
