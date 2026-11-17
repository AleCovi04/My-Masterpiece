import { describe, expect, it } from 'vitest'
import { buildExportFile, parseImportFile } from './exportFile'
import { migrate, MIGRATIONS, SCHEMA_VERSION, type RawData } from './migrations'
import { sanitize } from './validate'

const now = '2026-11-16T08:00:00.000Z'

/** Dati nello schema v0: muscoli con i vecchi nomi, serie con i kg. */
const v0 = (): RawData => ({
  exercises: [
    {
      id: 'panca',
      createdAt: now,
      updatedAt: now,
      name: 'Panca piana',
      muscles: [
        { muscle: 'Petto', percent: 100 },
        { muscle: 'Tricipiti', percent: 40 },
      ],
      defaultRestSeconds: 165,
      archived: false,
    },
  ],
  templates: [
    {
      id: 'tpl',
      createdAt: now,
      updatedAt: now,
      name: 'Forza A',
      discipline: 'strength',
      archived: false,
      entries: [
        {
          exerciseId: 'panca',
          restSeconds: 165,
          supersetId: 'x',
          sets: [
            { reps: 8, kg: 60, rir: 2 },
            { reps: 6, kg: 0, rir: 0 },
          ],
        },
      ],
    },
    {
      id: 'run',
      createdAt: now,
      updatedAt: now,
      name: 'Lungo',
      discipline: 'run',
      archived: false,
      mode: 'simple',
      simple: { goal: 'distance', distanceM: 10000 },
    },
  ],
  sessions: [
    {
      id: 's1',
      createdAt: now,
      updatedAt: now,
      date: '2026-11-16',
      order: 0,
      status: 'done',
      discipline: 'strength',
      templateId: 'tpl',
      plan: {
        entries: [
          {
            exerciseId: 'panca',
            restSeconds: 165,
            sets: [{ reps: 8, kg: 60, rir: 2 }],
          },
        ],
      },
      actual: {
        discipline: 'strength',
        startedAt: now,
        exercises: [
          {
            exerciseId: 'panca',
            skipped: false,
            sets: [{ kg: 62.5, reps: 8, rir: 1, completedAt: now }],
          },
        ],
      },
    },
  ],
  raceDate: '2028-08-20',
})

describe('migrazioni', () => {
  it('sono numerate in ordine, senza buchi, da 1', () => {
    expect(MIGRATIONS.map((m) => m.to)).toEqual(MIGRATIONS.map((_, i) => i + 1))
    expect(SCHEMA_VERSION).toBe(MIGRATIONS.length)
  })

  it('v0 → v1: muscoli nei 20 gruppi', () => {
    const d = MIGRATIONS[0].migrate(v0())
    expect(d.exercises[0]).toMatchObject({
      muscles: [
        { muscle: 'chest', percent: 100 },
        { muscle: 'triceps', percent: 40 },
      ],
    })
  })

  it('v1 → v2: via i kg da template e piani, via il RIR dall’eseguito', () => {
    const d = MIGRATIONS[1].migrate(v0())
    expect(d.templates[0]).toMatchObject({
      name: 'Forza A',
      entries: [
        {
          exerciseId: 'panca',
          restSeconds: 165,
          supersetId: 'x',
          // il RIR 0 resta 0: era un valore, non un campo vuoto
          sets: [
            { reps: 8, rir: 2 },
            { reps: 6, rir: 0 },
          ],
        },
      ],
    })
    expect(JSON.stringify(d.templates)).not.toContain('"kg"')
    expect(d.templates[1]).toEqual(v0().templates[1])
    const s = d.sessions[0] as {
      plan: { entries: { sets: unknown[] }[] }
      actual: { exercises: { sets: unknown[] }[] }
    }
    expect(s.plan.entries[0].sets).toEqual([{ reps: 8, rir: 2 }])
    expect(s.actual.exercises[0].sets).toEqual([
      { kg: 62.5, reps: 8, completedAt: now },
    ])
  })

  it('v2 → v3: nessun dato cambia (note facoltative nell’eseguito)', () => {
    const d = MIGRATIONS[1].migrate(v0())
    expect(MIGRATIONS[2].migrate(d)).toEqual(d)
  })

  it('v3 → v4: nessun dato cambia; i brick sono validi solo con 2–6 frazioni', () => {
    const d = migrate(v0(), 0)
    expect(MIGRATIONS[3].migrate(d)).toEqual(d)
    const leg = (id: string, discipline: string) => ({
      id,
      discipline,
      mode: 'simple',
      simple: { goal: 'distance' },
    })
    const brick = (id: string, legs: unknown[]) => ({
      id,
      name: 'Brick',
      discipline: 'brick',
      legs,
    })
    const { data, dropped } = sanitize({
      exercises: [],
      templates: [
        brick('ok', [
          leg('a', 'bike'),
          { ...leg('b', 'run'), transitionBeforeS: 120 },
        ]),
        brick('una', [leg('a', 'bike')]),
        brick('forza', [leg('a', 'bike'), leg('b', 'strength')]),
        brick('zero', []),
      ],
      sessions: [
        {
          id: 's',
          date: '2026-11-20',
          discipline: 'brick',
          plan: { legs: [leg('a', 'swim'), leg('b', 'bike')] },
        },
        // seduta brick vuota (appena creata dal Calendario): valida
        {
          id: 'vuota',
          date: '2026-11-20',
          discipline: 'brick',
          plan: { legs: [] },
        },
      ],
      raceDate: null,
    })
    expect(data.templates.map((t) => t.id)).toEqual(['ok'])
    expect(data.sessions).toHaveLength(2)
    expect(dropped).toBe(3)
  })

  it('v4 → v5: via passo e velocità medi dall’eseguito endurance, giri sempre presenti', () => {
    const d: RawData = {
      exercises: [],
      templates: [],
      sessions: [
        {
          id: 'c',
          discipline: 'run',
          actual: {
            discipline: 'run',
            source: 'manual',
            distanceM: 10000,
            durationS: 3000,
            avgPaceSecPerKm: 300,
          },
        },
        {
          id: 'b',
          discipline: 'bike',
          actual: {
            discipline: 'bike',
            source: 'manual',
            distanceM: 30000,
            durationS: 3600,
            avgSpeedKmh: 30,
            laps: [{ distanceM: 1000, durationS: 120 }],
          },
        },
        { id: 'f', discipline: 'strength', actual: { exercises: [] } },
      ],
      raceDate: null,
    }
    const out = MIGRATIONS[4].migrate(d)
    expect(out.sessions[0]).toEqual({
      id: 'c',
      discipline: 'run',
      actual: {
        discipline: 'run',
        source: 'manual',
        distanceM: 10000,
        durationS: 3000,
        laps: [],
      },
    })
    expect(out.sessions[1]).toMatchObject({
      actual: { laps: [{ distanceM: 1000, durationS: 120 }] },
    })
    expect((out.sessions[1] as { actual: object }).actual).not.toHaveProperty(
      'avgSpeedKmh',
    )
    expect(out.sessions[2]).toBe(d.sessions[2])
  })

  it('migrate applica solo le migrazioni mancanti ed è valida alla fine', () => {
    const d = migrate(v0(), 0)
    expect(sanitize(d).dropped).toBe(0)
    expect(migrate(d, SCHEMA_VERSION)).toBe(d)
    // da v1 i muscoli non si toccano più
    const onlyV2 = migrate(v0(), 1)
    expect(onlyV2.exercises).toEqual(v0().exercises)
  })

  it('dati malformati non fanno fallire le migrazioni', () => {
    const odd: RawData = {
      exercises: [null, 3],
      templates: [{ discipline: 'strength', entries: 'x' }, null],
      sessions: [{ discipline: 'strength' }, 'x'],
      raceDate: 5,
    }
    const { data, dropped } = sanitize(migrate(odd, 0))
    expect(dropped).toBe(6)
    expect(data).toEqual({
      exercises: [],
      templates: [],
      sessions: [],
      raceDate: null,
    })
  })
})

describe('import/export', () => {
  it('un export si reimporta identico', () => {
    const data = sanitize(migrate(v0(), 0)).data
    const file = buildExportFile(data, new Date(now))
    expect(file).toMatchObject({
      app: 'my-masterpiece',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: now,
    })
    const r = parseImportFile(JSON.stringify(file))
    expect(r).toMatchObject({
      ok: true,
      fromVersion: SCHEMA_VERSION,
      exportedAt: now,
      dropped: 0,
      counts: { exercises: 1, templates: 2, sessions: 1 },
    })
    expect(r.ok && r.data).toEqual(data)
  })

  it('un file vecchio viene migrato', () => {
    const r = parseImportFile(
      JSON.stringify({
        app: 'my-masterpiece',
        schemaVersion: 1,
        exportedAt: now,
        data: v0(),
      }),
    )
    expect(r).toMatchObject({ ok: true, fromVersion: 1 })
    expect(JSON.stringify(r)).not.toContain('"kg":60')
  })

  it('rifiuta file non validi o troppo nuovi', () => {
    const bad = (v: unknown) =>
      parseImportFile(typeof v === 'string' ? v : JSON.stringify(v))
    expect(bad('non json')).toEqual({ ok: false, error: 'invalid' })
    expect(bad([])).toEqual({ ok: false, error: 'invalid' })
    expect(bad({ app: 'altro', schemaVersion: 1, data: v0() })).toEqual({
      ok: false,
      error: 'invalid',
    })
    expect(
      bad({ app: 'my-masterpiece', schemaVersion: 1, data: { exercises: [] } }),
    ).toEqual({ ok: false, error: 'invalid' })
    expect(
      bad({
        app: 'my-masterpiece',
        schemaVersion: SCHEMA_VERSION + 1,
        data: v0(),
      }),
    ).toEqual({ ok: false, error: 'newer' })
  })

  it('conta gli elementi scartati', () => {
    const r = parseImportFile(
      JSON.stringify({
        app: 'my-masterpiece',
        schemaVersion: SCHEMA_VERSION,
        data: { exercises: [{ id: 1 }], templates: [], sessions: [] },
      }),
    )
    expect(r).toMatchObject({ ok: true, dropped: 1, counts: { exercises: 0 } })
  })
})
