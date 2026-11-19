import { describe, expect, it } from 'vitest'
import { GOAL_MAX } from './types'
import { normalizeGoal, sanitizeSettings } from './validate'

describe('obiettivo nelle impostazioni', () => {
  it('pulisce spazi e lunghezza; vuoto = nessuno', () => {
    expect(normalizeGoal('  70.3  ')).toBe('70.3')
    expect(normalizeGoal('Maratona   di\nRoma')).toBe('Maratona di Roma')
    expect(normalizeGoal('x'.repeat(GOAL_MAX + 10))).toHaveLength(GOAL_MAX)
    expect(normalizeGoal('   ')).toBeUndefined()
    expect(normalizeGoal(42)).toBeUndefined()
  })

  it('sanitizeSettings tiene l’obiettivo valido e scarta il resto', () => {
    expect(sanitizeSettings({ goal: ' Ironman ' }).goal).toBe('Ironman')
    expect(sanitizeSettings({ goal: '' })).not.toHaveProperty('goal')
    expect(sanitizeSettings({})).not.toHaveProperty('goal')
    // le altre impostazioni restano quelle di prima
    expect(sanitizeSettings({ goal: '70.3' }).thresholds).toEqual({})
  })
})
