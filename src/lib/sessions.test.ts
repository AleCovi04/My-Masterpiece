import { describe, expect, it } from 'vitest'
import type {
  RunTemplate,
  Session,
  StrengthSession,
  StrengthTemplate,
} from '../data/types'
import { exerciseUsage } from './exercises'
import { sessionsOn } from './reorder'
import {
  applyEditedPlan,
  duplicateSession,
  emptySession,
  insertSession,
  removeSession,
  sessionAsTemplate,
  sessionDurationSec,
  sessionFromTemplate,
  setSessionStatus,
} from './sessions'
import { plannedSeconds, summarize } from './weekStats'

const now = '2026-11-16T08:00:00.000Z'
const day = '2026-11-16'

const strength: StrengthTemplate = {
  id: 'tpl-forza',
  createdAt: now,
  updatedAt: now,
  name: 'Forza A',
  discipline: 'strength',
  estimatedDurationSec: 3600,
  archived: false,
  entries: [
    {
      exerciseId: 'panca',
      restSeconds: 165,
      sets: [
        { reps: 8, kg: 60, rir: 2 },
        { reps: 8, kg: 60, rir: 2 },
      ],
    },
  ],
}

const run: RunTemplate = {
  id: 'tpl-corsa',
  createdAt: now,
  updatedAt: now,
  name: 'Ripetute',
  discipline: 'run',
  mode: 'structured',
  archived: false,
  items: [
    { kind: 'step', id: 'w', type: 'warmup', durationS: 600 },
    {
      kind: 'repeat',
      id: 'r',
      times: 4,
      steps: [
        {
          kind: 'step',
          id: 'a',
          type: 'work',
          distanceM: 1000,
          intensity: 240,
        },
        { kind: 'step', id: 'b', type: 'recovery', durationS: 60 },
      ],
    },
  ],
}

const ids = (list: Session[]) => list.map((s) => s.id)
const mk = (id: string) => sessionFromTemplate(strength, day, now, id)

describe('seduta da template', () => {
  it('copia nome, durata e piano', () => {
    const s = sessionFromTemplate(strength, day, now, 's1') as StrengthSession
    expect(s).toMatchObject({
      id: 's1',
      date: day,
      status: 'planned',
      discipline: 'strength',
      templateId: 'tpl-forza',
      name: 'Forza A',
      estimatedDurationSec: 3600,
    })
    expect(s.plan.entries).toEqual(strength.entries)
    expect(s.actual).toBeUndefined()
  })

  it('la copia è indipendente dal template, nei due sensi', () => {
    const tpl = structuredClone(strength)
    const s = sessionFromTemplate(tpl, day, now, 's1') as StrengthSession
    tpl.entries[0].sets[0].kg = 100
    tpl.name = 'Rinominato'
    expect(s.plan.entries[0].sets[0].kg).toBe(60)
    expect(s.name).toBe('Forza A')
    s.plan.entries[0].sets[1].reps = 1
    expect(tpl.entries[0].sets[1].reps).toBe(8)
  })

  it('endurance: la durata si calcola dal piano', () => {
    const s = sessionFromTemplate(run, day, now, 's2')
    expect(s.estimatedDurationSec).toBeUndefined()
    // 10′ + 4 × (1 km a 4:00 + 1′)
    expect(sessionDurationSec(s)).toBe(600 + 4 * (240 + 60))
    expect(plannedSeconds(s)).toBe(1800)
  })

  it('seduta vuota: nessun template, durata non nota', () => {
    const s = emptySession('swim', day, now, 'e1')
    expect(s.templateId).toBeUndefined()
    expect(s.name).toBeUndefined()
    expect(sessionDurationSec(s)).toBeNull()
    expect(plannedSeconds(s)).toBe(0)
    expect(sessionDurationSec(emptySession('strength', day, now))).toBeNull()
  })
})

describe('ordine nel giorno', () => {
  const base = [mk('a'), mk('b'), mk('c')].reduce<Session[]>(
    (list, s, i) => insertSession(list, s, day, i, now),
    [],
  )

  it('inserisce esattamente nella posizione scelta', () => {
    expect(ids(sessionsOn(base, day))).toEqual(['a', 'b', 'c'])
    const top = insertSession(base, mk('x'), day, 0, now)
    expect(ids(sessionsOn(top, day))).toEqual(['x', 'a', 'b', 'c'])
    const mid = insertSession(base, mk('x'), day, 2, now)
    expect(ids(sessionsOn(mid, day))).toEqual(['a', 'b', 'x', 'c'])
    expect(sessionsOn(mid, day).map((s) => s.order)).toEqual([0, 1, 2, 3])
    const end = insertSession(base, mk('x'), day, 99, now)
    expect(ids(sessionsOn(end, day))).toEqual(['a', 'b', 'c', 'x'])
  })

  it('usa la data di arrivo anche se la seduta ne aveva un’altra', () => {
    const other = sessionFromTemplate(strength, '2026-01-01', now, 'x')
    const r = insertSession(base, other, day, 1, now)
    expect(ids(sessionsOn(r, day))).toEqual(['a', 'x', 'b', 'c'])
  })

  it('elimina e richiude i buchi', () => {
    const r = removeSession(base, 'b', now)
    expect(sessionsOn(r, day).map((s) => [s.id, s.order])).toEqual([
      ['a', 0],
      ['c', 1],
    ])
    expect(removeSession(base, 'zzz', now)).toBe(base)
  })

  it('duplica subito dopo l’originale, programmata e senza eseguito', () => {
    const done = base.map((s) =>
      s.id === 'a'
        ? ({
            ...(s as StrengthSession),
            status: 'done',
            actual: {
              discipline: 'strength',
              startedAt: now,
              endedAt: now,
              exercises: [],
            },
          } satisfies StrengthSession)
        : s,
    )
    const r = duplicateSession(done, 'a', now, 'copy')
    expect(ids(sessionsOn(r, day))).toEqual(['a', 'copy', 'b', 'c'])
    const copy = r.find((s) => s.id === 'copy') as StrengthSession
    expect(copy.status).toBe('planned')
    expect(copy.actual).toBeUndefined()
    expect(copy.templateId).toBe('tpl-forza')
    // copia profonda: modificarla non tocca l'originale
    copy.plan.entries[0].sets[0].kg = 1
    const original = r.find((s) => s.id === 'a') as StrengthSession
    expect(original.plan.entries[0].sets[0].kg).toBe(60)
  })

  it('salta e ripristina', () => {
    const skipped = setSessionStatus(base, 'b', 'skipped', now)
    expect(skipped.find((s) => s.id === 'b')?.status).toBe('skipped')
    // le saltate non contano nelle ore pianificate
    expect(summarize(skipped, day).plannedS).toBe(2 * 3600)
    const back = setSessionStatus(skipped, 'b', 'planned', now)
    expect(summarize(back, day).plannedS).toBe(3 * 3600)
  })
})

describe('modifica del piano di una seduta', () => {
  it('cambia solo la seduta e ne conserva data, stato e origine', () => {
    const s = { ...mk('s1'), order: 2, status: 'skipped' } as StrengthSession
    const edited: StrengthTemplate = {
      ...sessionAsTemplate(s),
      name: 'Forza A leggera',
      estimatedDurationSec: undefined,
      entries: [{ exerciseId: 'squat', restSeconds: 120, sets: [] }],
    }
    const r = applyEditedPlan(s, edited, now) as StrengthSession
    expect(r).toMatchObject({
      id: 's1',
      date: day,
      order: 2,
      status: 'skipped',
      templateId: 'tpl-forza',
      name: 'Forza A leggera',
    })
    expect(r.estimatedDurationSec).toBeUndefined()
    expect(r.plan.entries.map((e) => e.exerciseId)).toEqual(['squat'])
    expect(strength.entries.map((e) => e.exerciseId)).toEqual(['panca'])
  })

  it('senza nome torna a mostrarsi la disciplina', () => {
    const s = sessionFromTemplate(run, day, now, 's2')
    if (s.discipline === 'strength') throw new Error('attesa una corsa')
    const r = applyEditedPlan(s, { ...sessionAsTemplate(s), name: '' }, now)
    expect(r.name).toBeUndefined()
    expect(r.plan).toEqual(s.plan)
  })
})

describe('uso degli esercizi nelle sedute', () => {
  it('conta le sedute il cui piano contiene l’esercizio', () => {
    const sessions = [mk('a'), sessionFromTemplate(run, day, now, 'b')]
    expect(exerciseUsage('panca', [strength], sessions)).toEqual({
      templates: 1,
      sessions: 1,
    })
    expect(exerciseUsage('nuovo', [strength], sessions)).toEqual({
      templates: 0,
      sessions: 0,
    })
  })
})
