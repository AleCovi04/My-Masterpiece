import { describe, expect, it } from 'vitest'
import type { BlockApplication } from '../data/types'
import {
  addMonthsIso,
  choiceToPeriod,
  DEFAULT_CHOICE,
  parseChoice,
  planEntries,
  shiftChoice,
  type LastUnit,
  type PeriodChoice,
} from './analysis'
import { buildPlan } from './plan'

const now = '2026-11-01T00:00:00.000Z'
const today = '2026-11-18'
const app = (
  id: string,
  kind: 'phase' | 'block',
  start: string,
  blocks: [string, number][],
): BlockApplication => {
  const weeks = []
  let d = new Date(`${start}T00:00:00`)
  for (const [blockId, n] of blocks) {
    for (let w = 1; w <= n; w++) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      weeks.push({ start: iso, blockId, blockName: blockId, week: w, weeks: n })
      d = new Date(d.getTime() + 7 * 864e5)
    }
  }
  return {
    id,
    createdAt: now,
    updatedAt: now,
    kind,
    sourceId: id,
    name: id,
    startDate: start,
    weeks,
  }
}
const entries = planEntries(
  buildPlan(
    [
      app('Base', 'phase', '2026-09-28', [
        ['carico', 3],
        ['scarico', 1],
      ]),
      app('Build', 'phase', '2026-10-26', [
        ['carico2', 3],
        ['scarico', 1],
      ]),
      app('Test', 'block', '2026-11-23', [['test', 1]]),
    ],
    [],
    today,
  ),
)

describe('voci del Piano', () => {
  it('ogni fase seguita dai suoi blocchi, con le date', () => {
    expect(entries.map((e) => `${e.level}:${e.name}`)).toEqual([
      'app:Base',
      'run:carico',
      'run:scarico',
      'app:Build',
      'run:carico2',
      'run:scarico',
      'app:Test',
    ])
    expect(entries[3]).toMatchObject({
      start: '2026-10-26',
      end: '2026-11-22',
      timing: 'current',
    })
    expect(entries[4].parent).toBe(entries[3].value)
  })
})

describe('periodo scelto', () => {
  it('ultime N settimane, mesi, anni fino a oggi; le frecce spostano della stessa durata', () => {
    const last = (unit: LastUnit, n: number, offset = 0) =>
      choiceToPeriod({ kind: 'last', unit, n, offset }, entries, today)
    expect(last('week', 6)).toEqual({
      kind: 'range',
      start: '2026-10-08',
      end: today,
    })
    expect(last('week', 6, -1)).toEqual({
      kind: 'range',
      start: '2026-08-27',
      end: '2026-10-07',
    })
    expect(last('month', 3)).toEqual({
      kind: 'range',
      start: '2026-08-19',
      end: today,
    })
    expect(last('month', 3, -1)).toEqual({
      kind: 'range',
      start: '2026-05-19',
      end: '2026-08-18',
    })
    expect(last('year', 1)).toEqual({
      kind: 'range',
      start: '2025-11-19',
      end: today,
    })
    expect(
      shiftChoice(
        { kind: 'last', unit: 'month', n: 3, offset: 0 },
        -1,
        entries,
      ),
    ).toEqual({ kind: 'last', unit: 'month', n: 3, offset: -1 })
  })

  it('mesi: fine mese senza giorno uguale → ultimo giorno', () => {
    expect(addMonthsIso('2026-05-31', -3)).toBe('2026-02-28')
    expect(addMonthsIso('2024-03-31', -1)).toBe('2024-02-29')
    expect(addMonthsIso('2026-01-15', -13)).toBe('2024-12-15')
  })

  it('voce del Piano sparita → predefinito', () => {
    expect(
      choiceToPeriod({ kind: 'plan', value: 'a:nope' }, entries, today),
    ).toEqual(choiceToPeriod(DEFAULT_CHOICE, entries, today))
  })

  it('frecce: tra voci dello stesso livello, null ai bordi e su Tutto', () => {
    const build: PeriodChoice = { kind: 'plan', value: entries[3].value }
    expect(shiftChoice(build, -1, entries)).toEqual({
      kind: 'plan',
      value: entries[0].value,
    })
    expect(shiftChoice(build, 1, entries)).toEqual({
      kind: 'plan',
      value: entries[6].value,
    })
    expect(
      shiftChoice({ kind: 'plan', value: entries[0].value }, -1, entries),
    ).toBeNull()
    // dal blocco "scarico" di Base al primo blocco di Build
    expect(
      shiftChoice({ kind: 'plan', value: entries[2].value }, 1, entries),
    ).toEqual({
      kind: 'plan',
      value: entries[4].value,
    })
    expect(shiftChoice({ kind: 'all' }, 1, entries)).toBeNull()
    expect(
      shiftChoice(
        { kind: 'custom', start: '2026-11-01', end: '2026-11-10' },
        1,
        entries,
      ),
    ).toEqual({ kind: 'custom', start: '2026-11-11', end: '2026-11-20' })
  })

  it('scelta salvata: solo se valida; riparte da oggi', () => {
    expect(
      parseChoice('{"kind":"last","unit":"month","n":3,"offset":-3}'),
    ).toEqual({ kind: 'last', unit: 'month', n: 3, offset: 0 })
    expect(parseChoice('{"kind":"last","unit":"day","n":3}')).toBeNull()
    expect(parseChoice('{"kind":"last","unit":"year","n":0}')).toBeNull()
    // versioni precedenti del filtro
    expect(parseChoice('{"kind":"weeks","weeks":12,"offset":-3}')).toEqual({
      kind: 'last',
      unit: 'week',
      n: 12,
      offset: 0,
    })
    expect(
      parseChoice('{"kind":"custom","start":"2026-11-10","end":"2026-11-01"}'),
    ).toBeNull()
    expect(parseChoice('x')).toBeNull()
    expect(parseChoice(null)).toBeNull()
    expect(parseChoice('{"kind":"year","year":2026}')).toEqual({
      kind: 'custom',
      start: '2026-01-01',
      end: '2026-12-31',
    })
  })
})
