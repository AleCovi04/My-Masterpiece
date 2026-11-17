import { describe, expect, it } from 'vitest'
import type { EnduranceItem } from '../../data/types'
import { cloneDraft, draftFromPlan, evalDraft } from './endurancePlanDraft'

const items: EnduranceItem[] = [
  { kind: 'step', id: 'w', type: 'warmup', durationS: 600 },
  {
    kind: 'repeat',
    id: 'r',
    times: 4,
    steps: [
      { kind: 'step', id: 'a', type: 'work', distanceM: 400, intensity: 240 },
      { kind: 'step', id: 'b', type: 'recovery', durationS: 90 },
    ],
  },
]

const noIds = (xs: unknown) => JSON.stringify(xs).replace(/"id":"[^"]*"/g, '')

describe('bozza del piano endurance', () => {
  it('piano → bozza → piano resta uguale', () => {
    const ev = evalDraft(
      'run',
      draftFromPlan('run', { mode: 'structured', items }),
    )
    expect(ev.valid).toBe(true)
    expect(ev.content).toEqual({ mode: 'structured', items })
    const simple = { goal: 'time' as const, durationS: 2700, intensity: 330 }
    const back = evalDraft(
      'run',
      draftFromPlan('run', { mode: 'simple', simple }),
    )
    expect(back.content).toEqual({ mode: 'simple', simple })
  })

  it('bozza vuota non valida; strutturata senza passi segnalata', () => {
    const dr = draftFromPlan('bike')
    expect(evalDraft('bike', dr).valid).toBe(false)
    expect(evalDraft('bike', { ...dr, mode: 'structured' }).noSteps).toBe(true)
  })

  it('la copia ha id nuovi ma gli stessi valori', () => {
    const dr = draftFromPlan('run', { mode: 'structured', items })
    const copy = cloneDraft(dr)
    expect(copy.tree.map((it) => it.id)).not.toContain('w')
    expect(noIds(evalDraft('run', copy).content.items)).toBe(noIds(items))
  })
})
