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

  it('senza passo il tempo si scrive a mano; con il passo si calcola', () => {
    const dr = { ...draftFromPlan('run'), sDist: '10', sUnit: 'km' as const }
    const manual = evalDraft('run', { ...dr, sTime: '55:00' })
    expect(manual.content.simple).toEqual({
      goal: 'distance',
      distanceM: 10000,
      durationS: 3300,
    })
    expect(manual.autoDuration).toBe(3300)
    // con il passo il tempo scritto non si salva: vale quello calcolato
    const paced = evalDraft('run', { ...dr, sTime: '55:00', sInt: '5:00' })
    expect(paced.content.simple).toEqual({
      goal: 'distance',
      distanceM: 10000,
      intensity: 300,
    })
    expect(paced.autoDuration).toBe(3000)
    expect(evalDraft('run', { ...dr, sTime: 'abc' }).valid).toBe(false)
    // al contrario: obiettivo a tempo, distanza a mano
    const byTime = evalDraft('bike', {
      ...draftFromPlan('bike'),
      goal: 'time',
      sTime: '1:30:00',
      sDist: '45',
      sUnit: 'km',
    })
    expect(byTime.simpleStats).toEqual({ distanceM: 45000, durationS: 5400 })
  })

  it('il tempo a mano si rilegge dal piano salvato', () => {
    const simple = {
      goal: 'distance' as const,
      distanceM: 5000,
      durationS: 1500,
    }
    const dr = draftFromPlan('run', { mode: 'simple', simple })
    expect(dr.sTime).toBe('25:00')
    expect(evalDraft('run', dr).content).toEqual({ mode: 'simple', simple })
  })
})
