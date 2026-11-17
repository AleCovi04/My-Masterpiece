import { describe, expect, it } from 'vitest'
import type {
  ActualExercise,
  Exercise,
  LiveWorkout,
  Session,
  StrengthSession,
  TemplateEntry,
} from '../data/types'
import {
  addExercises,
  addSet,
  adjustRest,
  cancelSession,
  completeSet,
  createLiveWorkout,
  editSetText,
  finishSession,
  hasDoneSets,
  liveActual,
  liveSummary,
  moveExercise,
  removeSet,
  resolveSet,
  restRemainingS,
  resumeLive,
  setHint,
  setRest,
  skipRest,
  startSession,
  supersetLabels,
  toggleSkip,
  uncompleteSet,
} from './liveWorkout'

const t = '2026-11-16T10:00:00.000Z'
const T = Date.parse(t)

const strength = (
  id: string,
  date: string,
  entries: TemplateEntry[],
  extra: Partial<StrengthSession> = {},
): StrengthSession => ({
  id,
  createdAt: t,
  updatedAt: t,
  date,
  order: 0,
  status: 'planned',
  discipline: 'strength',
  plan: { entries },
  ...extra,
})

const done = (id: string, date: string, exercises: ActualExercise[]): Session =>
  strength(id, date, [], {
    status: 'done',
    actual: { discipline: 'strength', startedAt: t, endedAt: t, exercises },
  })

const sets = (...kgReps: [number, number][]) =>
  kgReps.map(([kg, reps]) => ({ kg, reps, completedAt: t }))

const entry = (
  exerciseId: string,
  n: number,
  extra: Partial<TemplateEntry> = {},
): TemplateEntry => ({
  exerciseId,
  restSeconds: 120,
  sets: Array.from({ length: n }, () => ({ reps: 10, rir: 2 })),
  ...extra,
})

const live = (entries: TemplateEntry[]) =>
  createLiveWorkout(strength('cur', '2026-11-16', entries), t)

const ids = (w: LiveWorkout) => w.exercises.map((e) => e.id)
const focusOf = (w: LiveWorkout) =>
  w.focus && [
    w.exercises.findIndex((e) => e.id === w.focus!.exercise),
    w.focus.set,
  ]

const history: Session[] = [
  done('old', '2026-11-01', [
    {
      exerciseId: 'panca',
      skipped: false,
      sets: sets([80, 8], [80, 7], [75, 8]),
    },
  ]),
  done('last', '2026-11-09', [
    { exerciseId: 'panca', skipped: false, sets: sets([82.5, 8]) },
  ]),
]

describe('avvio', () => {
  it('copia voci, serie e obiettivi; focus sulla prima serie', () => {
    const w = live([entry('panca', 2, { supersetId: 'x' }), entry('rem', 1)])
    expect(w.exercises[0]).toMatchObject({
      exerciseId: 'panca',
      restSeconds: 120,
      supersetId: 'x',
      skipped: false,
    })
    expect(w.exercises[0].sets[0]).toMatchObject({
      kg: '',
      reps: '',
      targetReps: 10,
      targetRir: 2,
    })
    expect(focusOf(w)).toEqual([0, 0])
    expect(w.rest).toBeNull()
  })

  it('la seduta passa in corso con l’ora di inizio', () => {
    const [s] = startSession([strength('a', '2026-11-16', [])], 'a', t)
    expect(s).toMatchObject({
      status: 'in_progress',
      actual: { startedAt: t, exercises: [] },
    })
  })
})

describe('valori in grigio e ✓', () => {
  const w = live([entry('panca', 2)])
  const ex = w.exercises[0]

  it('ultima volta = ultima seduta con l’esercizio, stessa serie; altrimenti vuoto', () => {
    expect(setHint(ex, 0, history)).toEqual({
      kg: 82.5,
      reps: 8,
      targetReps: 10,
    })
    // l'ultima seduta non aveva la seconda serie: niente kg/reps (non si risale)
    expect(setHint(ex, 1, history)).toEqual({ targetReps: 10 })
  })

  it('campi vuoti → valori in grigio (reps: ultima volta, poi obiettivo)', () => {
    expect(resolveSet(ex.sets[0], { kg: 80, reps: 7, targetReps: 10 })).toEqual(
      {
        ok: true,
        kg: 80,
        reps: 7,
      },
    )
    expect(resolveSet(ex.sets[0], { kg: 80, targetReps: 10 })).toEqual({
      ok: true,
      kg: 80,
      reps: 10,
    })
  })

  it('i valori digitati vincono, anche con la virgola', () => {
    const typed = { ...ex.sets[0], kg: '72,5', reps: '6' }
    expect(resolveSet(typed, { kg: 80, reps: 8 })).toEqual({
      ok: true,
      kg: 72.5,
      reps: 6,
    })
  })

  it('senza kg e senza storico non completa e indica il campo', () => {
    expect(resolveSet(ex.sets[0], { targetReps: 10 })).toEqual({
      ok: false,
      kg: true,
      reps: false,
    })
    const bad = { ...ex.sets[0], kg: 'abc', reps: '0' }
    expect(resolveSet(bad, { kg: 80, reps: 8 })).toEqual({
      ok: false,
      kg: true,
      reps: true,
    })
  })

  it('✓ registra, avanza alla serie dopo e fa partire il recupero; secondo ✓ annulla', () => {
    const a = completeSet(w, ex.id, 0, { kg: 80, reps: 8 }, T)
    expect(a.exercises[0].sets[0].done).toEqual({
      kg: 80,
      reps: 8,
      completedAt: t,
    })
    expect(focusOf(a)).toEqual([0, 1])
    expect(a.rest).toEqual({ endsAt: T + 120_000, totalS: 120 })
    const b = uncompleteSet(a, ex.id, 0)
    expect(b.exercises[0].sets[0].done).toBeUndefined()
    expect(focusOf(b)).toEqual([0, 0])
  })

  it('finite le serie, il focus passa all’esercizio successivo; alla fine niente recupero', () => {
    let x = live([entry('panca', 1), entry('rem', 1)])
    x = completeSet(x, x.exercises[0].id, 0, { kg: 80, reps: 8 }, T)
    expect(focusOf(x)).toEqual([1, 0])
    x = completeSet(skipRest(x), x.exercises[1].id, 0, { kg: 50, reps: 10 }, T)
    expect(x.focus).toBeNull()
    expect(x.rest).toBeNull()
  })

  it('editSetText conserva il testo digitato', () => {
    const x = editSetText(w, ex.id, 1, 'kg', '85')
    expect(x.exercises[0].sets[1].kg).toBe('85')
  })
})

describe('superserie', () => {
  const w = live([
    entry('a', 2, { supersetId: 's', restSeconds: 30 }),
    entry('b', 2, { supersetId: 's', restSeconds: 90 }),
    entry('c', 1),
  ])
  const [a, b] = w.exercises

  it('etichette dall’ordine', () =>
    expect(supersetLabels(w.exercises)).toEqual(['A', 'A', undefined]))

  it('il recupero parte solo dopo l’ultimo esercizio del giro', () => {
    const x1 = completeSet(w, a.id, 0, { kg: 10, reps: 10 }, T)
    expect(x1.rest).toBeNull()
    expect(focusOf(x1)).toEqual([1, 0])
    const x2 = completeSet(x1, b.id, 0, { kg: 20, reps: 10 }, T)
    // recupero dell'ultimo esercizio del giro, focus sul primo del giro dopo
    expect(x2.rest).toEqual({ endsAt: T + 90_000, totalS: 90 })
    expect(focusOf(x2)).toEqual([0, 1])
  })

  it('un esercizio saltato non conta nel giro', () => {
    const x = completeSet(toggleSkip(w, b.id), a.id, 0, { kg: 10, reps: 10 }, T)
    expect(x.rest).toEqual({ endsAt: T + 30_000, totalS: 30 })
    expect(focusOf(x)).toEqual([0, 1])
  })

  it('spostando un esercizio fuori dal gruppo la superserie si scioglie', () => {
    const x = moveExercise(w, 1, 2)
    expect(ids(x)).toEqual([w.exercises[0].id, w.exercises[2].id, b.id])
    expect(supersetLabels(x.exercises)).toEqual([
      undefined,
      undefined,
      undefined,
    ])
  })
})

describe('timer di recupero', () => {
  const base = setRest(live([entry('a', 1)]), 90, T)

  it('si calcola dai timestamp, anche dopo il background', () => {
    expect(restRemainingS(base.rest, T)).toBe(90)
    expect(restRemainingS(base.rest, T + 30_400)).toBe(60)
    expect(restRemainingS(base.rest, T + 200_000)).toBe(0)
  })

  it('−15 s e +15 s; a recupero finito +15 s riparte da adesso', () => {
    expect(restRemainingS(adjustRest(base, 15, T).rest, T)).toBe(105)
    expect(restRemainingS(adjustRest(base, -15, T).rest, T)).toBe(75)
    expect(restRemainingS(adjustRest(base, -200, T).rest, T)).toBe(0)
    const late = T + 120_000
    expect(restRemainingS(adjustRest(base, 15, late).rest, late)).toBe(15)
  })

  it('tempo a mano e salta', () => {
    expect(restRemainingS(setRest(base, 45, T).rest, T)).toBe(45)
    expect(setRest(base, 0, T).rest).toBeNull()
    expect(skipRest(base).rest).toBeNull()
  })
})

describe('modifiche durante la sessione', () => {
  const w = live([entry('a', 2)])
  const ex = w.exercises[0]

  it('aggiungi e togli serie (mai una completata)', () => {
    const more = addSet(w, ex.id)
    expect(more.exercises[0].sets).toHaveLength(3)
    expect(more.exercises[0].sets[2]).toMatchObject({
      targetReps: 10,
      targetRir: 2,
    })
    expect(removeSet(more, ex.id).exercises[0].sets).toHaveLength(2)
    const one = live([entry('a', 1)])
    const doneOne = completeSet(
      one,
      one.exercises[0].id,
      0,
      { kg: 1, reps: 1 },
      T,
    )
    expect(removeSet(doneOne, one.exercises[0].id)).toBe(doneOne)
  })

  it('salta sposta il focus; aggiungi esercizio usa recupero e serie dell’ultima volta', () => {
    const two = live([entry('a', 1), entry('b', 1)])
    expect(focusOf(toggleSkip(two, two.exercises[0].id))).toEqual([1, 0])
    const panca: Exercise = {
      id: 'panca',
      createdAt: t,
      updatedAt: t,
      name: 'Panca',
      muscles: [],
      defaultRestSeconds: 150,
      archived: false,
    }
    const nuovo = { ...panca, id: 'nuovo' }
    const x = addExercises(w, [panca, nuovo], history)
    expect(x.exercises[1]).toMatchObject({
      exerciseId: 'panca',
      restSeconds: 150,
    })
    expect(x.exercises[1].sets).toHaveLength(1) // l'ultima volta: 1 serie
    expect(x.exercises[2].sets).toHaveLength(3) // mai fatto: 3 serie
  })
})

describe('ripresa', () => {
  const s = strength('cur', '2026-11-16', [entry('a', 2)], {
    status: 'in_progress',
    actual: { discipline: 'strength', startedAt: t, exercises: [] },
  })
  const draft = createLiveWorkout(s, t)

  it('riprende la bozza salvata se la seduta è ancora in corso', () =>
    expect(resumeLive(draft, [s], '2026-11-16T11:00:00.000Z')).toBe(draft))

  it('bozza persa: riparte dal piano con l’ora di inizio salvata', () => {
    const r = resumeLive(null, [s], '2026-11-16T11:00:00.000Z')
    expect(r).toMatchObject({ sessionId: 'cur', startedAt: t })
  })

  it('bozza di una seduta non più in corso: niente da riprendere', () =>
    expect(resumeLive(draft, [{ ...s, status: 'done' }], t)).toBeNull())

  it('il recupero in corso resta giusto dopo la riapertura', () => {
    const resting = setRest(draft, 120, T)
    const reopened = resumeLive(
      JSON.parse(JSON.stringify(resting)) as LiveWorkout,
      [s],
      t,
    )
    expect(restRemainingS(reopened!.rest, T + 50_000)).toBe(70)
  })
})

describe('fine e riepilogo', () => {
  const w0 = live([entry('panca', 3), entry('rem', 2), entry('curl', 1)])
  const [p, r, c] = w0.exercises
  let w = completeSet(w0, p.id, 0, { kg: 85, reps: 5 }, T)
  w = completeSet(w, p.id, 1, { kg: 80, reps: 8 }, T)
  w = toggleSkip(w, c.id)
  const end = T + 3_725_000

  it('salva solo le serie completate; ignorati gli esercizi non fatti, tenuti i saltati', () => {
    const a = liveActual(w, new Date(end).toISOString(), '  ok  ')
    expect(a.exercises).toEqual([
      { exerciseId: 'panca', skipped: false, sets: sets([85, 5], [80, 8]) },
      { exerciseId: 'curl', skipped: true, sets: [] },
    ])
    expect(a.notes).toBe('ok')
    expect(a).not.toHaveProperty('rpe')
    expect(liveActual(w, new Date(end).toISOString(), '', 7).rpe).toBe(7)
    expect(
      liveActual(w, new Date(end).toISOString(), '', 12),
    ).not.toHaveProperty('rpe')
    expect(r.exerciseId).toBe('rem')
    const [s] = finishSession([strength('cur', '2026-11-16', [])], a, 'cur', t)
    expect(s).toMatchObject({ status: 'done', actual: a })
  })

  it('durata, serie, volume e record sopra tutto lo storico', () => {
    const sum = liveSummary(w, history, end)
    expect(sum.durationS).toBe(3725)
    expect(sum.setsDone).toBe(2)
    expect(sum.volumeKg).toBe(85 * 5 + 80 * 8)
    // storico panca: kg max 82,5 (anche a 4, 6 e 8 reps); serie migliore
    // 82,5 × 8 = 660; seduta migliore 640 + 560 + 600 = 1800
    expect(sum.records).toEqual([
      {
        exerciseId: 'panca',
        hits: [
          {
            metric: 'maxKg',
            value: 85,
            previous: 82.5,
            set: { kg: 85, reps: 5 },
          },
          { metric: 'r4', value: 85, previous: 82.5, set: { kg: 85, reps: 5 } },
        ],
      },
    ])
    // 82,5 × 10: niente record a 10 reps (mai fatto prima), sì in volume
    const more = completeSet(w, p.id, 2, { kg: 82.5, reps: 10 }, T)
    const hits = liveSummary(more, history, end).records[0].hits
    expect(hits.map((h) => h.metric)).toEqual([
      'maxKg',
      'r4',
      'setVolume',
      'sessionVolume',
    ])
    expect(hits[3]).toEqual({
      metric: 'sessionVolume',
      value: 425 + 640 + 825,
      previous: 1800,
    })
  })

  it('nessun record senza storico o se non supera', () => {
    expect(liveSummary(w, [], end).records).toEqual([])
    const weak = completeSet(w0, p.id, 0, { kg: 60, reps: 5 }, T)
    expect(liveSummary(weak, history, end).records).toEqual([])
  })
})

describe('annulla allenamento', () => {
  it('la seduta torna programmata senza eseguito; le altre restano uguali', () => {
    const started = startSession(
      [strength('a', '2026-11-16', []), strength('b', '2026-11-16', [])],
      'a',
      t,
    )
    const later = '2026-11-16T11:00:00.000Z'
    const [a, b] = cancelSession(started, 'a', later)
    expect(a.status).toBe('planned')
    expect('actual' in a).toBe(false)
    expect(a.updatedAt).toBe(later)
    expect(b).toBe(started[1])
  })

  it('riconosce se c’è almeno una serie completata', () => {
    const w = live([entry('panca', 2)])
    expect(hasDoneSets(w)).toBe(false)
    const p = w.exercises[0].id
    expect(hasDoneSets(completeSet(w, p, 0, { kg: 80, reps: 8 }, T))).toBe(true)
  })
})
