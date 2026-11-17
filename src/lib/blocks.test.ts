import { describe, expect, it } from 'vitest'
import type {
  BlockWeek,
  Phase,
  RunTemplate,
  Session,
  StrengthTemplate,
  TrainingBlock,
} from '../data/types'
import {
  addItems,
  applicationLabel,
  blockWeeks,
  copyWeekOnto,
  deleteBlock,
  duplicateWeek,
  emptyDays,
  isMonday,
  moveItem,
  newWeek,
  phaseWeeks,
  phasesUsing,
  planApplication,
  removeApplication,
  removeWeek,
  weekLabels,
  weekTotals,
} from './blocks'
import { emptySession, insertSession } from './sessions'

const now = '2026-11-17T08:00:00.000Z'
const run: RunTemplate = {
  id: 'run',
  createdAt: now,
  updatedAt: now,
  name: 'Lungo',
  discipline: 'run',
  archived: false,
  mode: 'simple',
  simple: { goal: 'time', durationS: 3600 },
}
const gym: StrengthTemplate = {
  id: 'gym',
  createdAt: now,
  updatedAt: now,
  name: 'Forza A',
  discipline: 'strength',
  archived: false,
  estimatedDurationSec: 2700,
  entries: [],
}
const templates = [run, gym]

const week = (spec: Record<number, string[]>): BlockWeek => {
  const days = emptyDays()
  for (const [d, ids] of Object.entries(spec))
    days[Number(d)] = ids.map((templateId, i) => ({
      id: `${d}-${i}-${templateId}`,
      kind: 'template' as const,
      templateId,
    }))
  return { id: `w${JSON.stringify(spec)}`, days }
}

const block = (id: string, weeks: BlockWeek[]): TrainingBlock => ({
  id,
  createdAt: now,
  updatedAt: now,
  name: `Blocco ${id}`,
  weeks,
  archived: false,
})

describe('settimane del blocco', () => {
  it('duplica, copia, elimina (sempre almeno una settimana, al massimo 12)', () => {
    const w1 = week({ 0: ['run'] })
    const two = duplicateWeek([w1], 0)
    expect(two).toHaveLength(2)
    expect(two[1].id).not.toBe(w1.id)
    expect(two[1].days[0][0].id).not.toBe(w1.days[0][0].id)
    const copied = copyWeekOnto([w1, newWeek()], 0, 1)
    expect(copied[1].days[0]).toHaveLength(1)
    expect(removeWeek([w1], 0)).toEqual([w1])
    const full = Array.from({ length: 12 }, newWeek)
    expect(duplicateWeek(full, 0)).toBe(full)
  })

  it('sposta un allenamento tra i giorni', () => {
    const w = week({ 0: ['run', 'gym'], 2: ['run'] })
    const id = w.days[0][1].id
    const moved = moveItem(w, id, 2, 0)
    expect(moved.days[0].map((x) => x.id)).toEqual([w.days[0][0].id])
    expect(moved.days[2][0].id).toBe(id)
    const added = addItems(w, 6, [
      { id: 'e', kind: 'empty', discipline: 'swim' },
    ])
    expect(added.days[6]).toHaveLength(1)
  })

  it('totali per sport; vuote e template eliminati contati a parte', () => {
    const w = week({ 0: ['run', 'gym'], 3: ['run', 'sparito'] })
    const withEmpty = addItems(w, 5, [
      { id: 'e', kind: 'empty', discipline: 'bike' },
    ])
    const t = weekTotals(withEmpty, templates)
    expect(t.bySport).toEqual({ swim: 0, bike: 0, run: 7200, strength: 2700 })
    expect(t.totalS).toBe(9900)
    expect(t).toMatchObject({ count: 5, unknown: 1, missing: 1 })
  })
})

describe('applicazione al calendario', () => {
  const a = block('a', [week({ 0: ['run'], 2: ['gym'] }), week({ 6: ['run'] })])
  const start = '2026-11-23' // lunedì

  it('crea le sedute alle date giuste, in coda al giorno, con l’etichetta delle settimane', () => {
    const existing = insertSession(
      [],
      emptySession('swim', start, now, 'nuoto'),
      start,
      0,
      now,
    )
    const r = planApplication(
      {
        kind: 'block',
        sourceId: 'a',
        name: a.name,
        weeks: blockWeeks(a),
        start,
        mode: 'append',
      },
      existing,
      templates,
      now,
      'app1',
    )
    expect(r.created).toBe(3)
    const mine = r.sessions.filter((s) => s.applicationId === 'app1')
    expect(mine.map((s) => [s.date, s.order, s.name])).toEqual([
      ['2026-11-23', 1, 'Lungo'],
      ['2026-11-25', 0, 'Forza A'],
      ['2026-12-06', 0, 'Lungo'],
    ])
    expect(r.application.weeks).toEqual([
      {
        start: '2026-11-23',
        blockId: 'a',
        blockName: 'Blocco a',
        week: 1,
        weeks: 2,
      },
      {
        start: '2026-11-30',
        blockId: 'a',
        blockName: 'Blocco a',
        week: 2,
        weeks: 2,
      },
    ])
    expect(weekLabels([r.application], '2026-11-30')[0].week.week).toBe(2)
    expect(isMonday(start)).toBe(true)
    expect(isMonday('2026-11-24')).toBe(false)
  })

  it('sostituisci: tolte solo le programmate delle settimane coperte', () => {
    let s: Session[] = []
    const add = (id: string, date: string, status: Session['status']) => {
      s = insertSession(
        s,
        { ...emptySession('run', date, now, id), status },
        date,
        9,
        now,
      )
    }
    add('p', '2026-11-24', 'planned')
    add('d', '2026-11-24', 'done')
    add('k', '2026-11-26', 'skipped')
    add('fuori', '2026-12-08', 'planned')
    const r = planApplication(
      {
        kind: 'block',
        sourceId: 'a',
        name: a.name,
        weeks: blockWeeks(a),
        start,
        mode: 'replace',
      },
      s,
      templates,
      now,
      'app2',
    )
    expect(r.replaced).toBe(1)
    const ids = r.sessions.map((x) => x.id)
    expect(ids).not.toContain('p')
    expect(ids).toEqual(expect.arrayContaining(['d', 'k', 'fuori']))
  })

  it('template eliminato: saltato e contato', () => {
    const b = block('b', [week({ 1: ['sparito', 'run'] })])
    const r = planApplication(
      {
        kind: 'block',
        sourceId: 'b',
        name: b.name,
        weeks: blockWeeks(b),
        start,
        mode: 'append',
      },
      [],
      templates,
      now,
    )
    expect(r).toMatchObject({ created: 1, missing: 1 })
  })

  it('fase: blocchi in sequenza, anche ripetuti; rimozione solo delle programmate', () => {
    const scarico = block('s', [week({ 3: ['run'] })])
    const phase: Phase = {
      id: 'ph',
      createdAt: now,
      updatedAt: now,
      name: 'Base',
      color: 2,
      blockIds: ['a', 'a', 's', 'sparito'],
      archived: false,
    }
    const weeks = phaseWeeks(phase, [a, scarico])
    expect(weeks.map((w) => `${w.block.id}${w.index}`)).toEqual([
      'a0',
      'a1',
      'a0',
      'a1',
      's0',
    ])
    const r = planApplication(
      {
        kind: 'phase',
        sourceId: 'ph',
        name: 'Base',
        color: 2,
        weeks,
        start,
        mode: 'append',
      },
      [],
      templates,
      now,
      'app3',
    )
    expect(r.application.weeks).toHaveLength(5)
    expect(r.application.color).toBe(2)
    const [w1, , w3] = r.application.weeks
    expect(applicationLabel(r.application, w3, 'sett.')).toBe(
      'Base · sett. 3/5 · Blocco a 1/2',
    )
    expect(
      applicationLabel({ ...r.application, kind: 'block' }, w1, 'sett.'),
    ).toBe('Blocco a · sett. 1/2')
    // una seduta svolta resta dopo la rimozione
    const done = r.sessions.map((s, i) =>
      i === 0 ? { ...s, status: 'done' as const } : s,
    )
    const out = removeApplication(done, [r.application], 'app3', now)
    expect(out.removed).toBe(r.created - 1)
    expect(out.sessions).toHaveLength(1)
    expect(out.applications).toEqual([])
  })
})

describe('eliminazione', () => {
  it('il blocco eliminato sparisce anche dalle fasi che lo usano', () => {
    const a = block('a', [newWeek()])
    const c = block('c', [newWeek()])
    const ph = (id: string, blockIds: string[]): Phase => ({
      id,
      createdAt: now,
      updatedAt: now,
      name: id,
      color: 1,
      blockIds,
      archived: false,
    })
    const phases = [ph('base', ['a', 'c', 'a']), ph('peak', ['c'])]
    expect(phasesUsing(phases, 'a').map((p) => p.id)).toEqual(['base'])
    const later = '2026-11-18T08:00:00.000Z'
    const r = deleteBlock([a, c], phases, 'a', later)
    expect(r.blocks.map((b) => b.id)).toEqual(['c'])
    expect(r.phases[0]).toMatchObject({ blockIds: ['c'], updatedAt: later })
    expect(r.phases[1]).toBe(phases[1])
  })
})
