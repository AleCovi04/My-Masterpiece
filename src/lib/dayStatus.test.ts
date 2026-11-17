import { describe, expect, it } from 'vitest'
import type { Session, SessionStatus } from '../data/types'
import { dayStatus } from './dayStatus'

const today = '2026-11-17'

function s(date: string, status: SessionStatus): Session {
  return { id: `${date}-${status}-${Math.random()}`, date, status } as Session
}

describe('dayStatus', () => {
  it('giorno passato: tutte svolte → done', () => {
    const list = [s('2026-11-10', 'done'), s('2026-11-10', 'done')]
    expect(dayStatus(list, '2026-11-10', today)).toBe('done')
  })

  it('giorno passato: alcune svolte → partial', () => {
    const list = [s('2026-11-10', 'done'), s('2026-11-10', 'skipped')]
    expect(dayStatus(list, '2026-11-10', today)).toBe('partial')
    const list2 = [s('2026-11-10', 'done'), s('2026-11-10', 'planned')]
    expect(dayStatus(list2, '2026-11-10', today)).toBe('partial')
  })

  it('giorno passato: nessuna svolta → missed (programmate comprese)', () => {
    expect(dayStatus([s('2026-11-10', 'skipped')], '2026-11-10', today)).toBe(
      'missed',
    )
    expect(dayStatus([s('2026-11-10', 'planned')], '2026-11-10', today)).toBe(
      'missed',
    )
    expect(
      dayStatus([s('2026-11-10', 'in_progress')], '2026-11-10', today),
    ).toBe('missed')
  })

  it('oggi: done solo se tutto svolto, altrimenti nessun esito', () => {
    expect(dayStatus([s(today, 'done')], today, today)).toBe('done')
    expect(
      dayStatus([s(today, 'done'), s(today, 'planned')], today, today),
    ).toBeNull()
    expect(dayStatus([s(today, 'skipped')], today, today)).toBeNull()
  })

  it('futuro o senza sedute: nessun esito', () => {
    expect(dayStatus([s('2026-11-20', 'done')], '2026-11-20', today)).toBeNull()
    expect(dayStatus([], '2026-11-10', today)).toBeNull()
    expect(dayStatus([s('2026-11-11', 'done')], '2026-11-10', today)).toBeNull()
  })
})
