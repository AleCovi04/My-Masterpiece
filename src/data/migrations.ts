// Migrazioni versionate dei dati. Vedi docs/modello-dati.md ("Migrazioni").
//
// Ogni migrazione porta l'insieme dei dati dalla versione `to - 1` alla
// versione `to`. Sono funzioni pure, eseguite in ordine all'avvio, quando si
// importa un file e quando si ripristina un backup.
import { migrateExercise } from '../lib/muscleMigration'
import { defaultSettings, type Exercise } from './types'

/** Dati non ancora validati: le migrazioni lavorano su forme vecchie. */
export interface RawData {
  exercises: unknown[]
  templates: unknown[]
  sessions: unknown[]
  /** Dalla versione 6 (assenti nei dati più vecchi). */
  blocks?: unknown[]
  phases?: unknown[]
  applications?: unknown[]
  raceDate: unknown
  /** Dalla versione 9 (assenti nei dati più vecchi). */
  settings?: unknown
  /** Dalla versione 10. */
  imports?: unknown[]
}

export interface Migration {
  /** Versione dello schema dopo la migrazione. */
  to: number
  description: string
  migrate(data: RawData): RawData
}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object'

/** Toglie il campo `color` (fasi e applicazioni, v8). */
function dropColor(v: unknown): unknown {
  if (!isObj(v) || !('color' in v)) return v
  const rest = { ...v }
  delete rest.color
  return rest
}

/** Applica `fn` alle serie di ogni voce (`entries[].sets[]`) di un piano di forza. */
function mapEntrySets(entries: unknown, fn: (set: Obj) => Obj): unknown {
  if (!Array.isArray(entries)) return entries
  return entries.map((entry: unknown) =>
    isObj(entry) && Array.isArray(entry.sets)
      ? {
          ...entry,
          sets: entry.sets.map((s: unknown) => (isObj(s) ? fn(s) : s)),
        }
      : entry,
  )
}

/** v2: la serie prevista ha solo reps e RIR obiettivo. */
function dropPlannedKg(set: Obj): Obj {
  return {
    ...(typeof set.reps === 'number' && { reps: set.reps }),
    ...(typeof set.rir === 'number' && { rir: set.rir }),
  }
}

/** v5: passo e velocità medi non si salvano più; i giri sono sempre una lista. */
function dropAveragePace(actual: Obj): Obj {
  const {
    avgPaceSecPerKm: _a,
    avgSpeedKmh: _b,
    avgPaceSecPer100m: _c,
    ...rest
  } = actual
  void [_a, _b, _c]
  return {
    ...rest,
    ...(rest.discipline !== 'brick' &&
      !Array.isArray(rest.laps) && { laps: [] }),
  }
}

/** v2: la serie eseguita non ha il RIR. */
function dropActualRir(actual: unknown): unknown {
  if (!isObj(actual) || !Array.isArray(actual.exercises)) return actual
  return {
    ...actual,
    exercises: actual.exercises.map((ex: unknown) =>
      isObj(ex) && Array.isArray(ex.sets)
        ? {
            ...ex,
            sets: ex.sets.map((s: unknown) => {
              if (!isObj(s)) return s
              const { rir: _rir, ...rest } = s
              void _rir
              return rest
            }),
          }
        : ex,
    ),
  }
}

/**
 * Elenco ordinato. Per aggiungerne una: nuova voce in fondo con `to` = ultima + 1.
 * Mai modificare o togliere una migrazione già pubblicata.
 */
export const MIGRATIONS: Migration[] = [
  {
    to: 1,
    description: 'Muscoli: dai vecchi 15 gruppi ai 20 della mappa del corpo',
    migrate: (d) => ({
      ...d,
      exercises: d.exercises.map((e) =>
        isObj(e) ? migrateExercise(e as unknown as Exercise) : e,
      ),
    }),
  },
  {
    to: 2,
    description:
      'Forza: le serie previste hanno solo reps e RIR obiettivo (via i kg); le serie eseguite non hanno il RIR',
    migrate: (d) => ({
      ...d,
      templates: d.templates.map((t) =>
        isObj(t) && t.discipline === 'strength'
          ? { ...t, entries: mapEntrySets(t.entries, dropPlannedKg) }
          : t,
      ),
      sessions: d.sessions.map((s) => {
        if (!isObj(s) || s.discipline !== 'strength') return s
        const plan = isObj(s.plan)
          ? { ...s.plan, entries: mapEntrySets(s.plan.entries, dropPlannedKg) }
          : s.plan
        return {
          ...s,
          plan,
          ...(s.actual !== undefined && { actual: dropActualRir(s.actual) }),
        }
      }),
    }),
  },
  {
    to: 3,
    description:
      'Forza: l’eseguito può avere note (`actual.notes`); nessun dato da convertire',
    // solo un campo facoltativo in più: la versione cambia perché le app più
    // vecchie non devono importare file che lo contengono (lo perderebbero)
    migrate: (d) => d,
  },
  {
    to: 4,
    description:
      'Nuovo tipo di allenamento brick (`discipline: brick`, frazioni in `legs`); nessun dato da convertire',
    // le app più vecchie non devono importare file con brick (li scarterebbero)
    migrate: (d) => d,
  },
  {
    to: 5,
    description:
      'Eseguito endurance manuale: via passo e velocità medi (si calcolano), distanza facoltativa, RPE e note; eseguito per frazione dei brick',
    migrate: (d) => ({
      ...d,
      sessions: d.sessions.map((s: unknown) =>
        isObj(s) && isObj(s.actual) && s.discipline !== 'strength'
          ? { ...s, actual: dropAveragePace(s.actual) }
          : s,
      ),
    }),
  },
  {
    to: 6,
    description:
      'Blocchi, fasi e applicazioni al calendario (nuovi elenchi, vuoti); sedute con `applicationId` facoltativo',
    migrate: (d) => ({
      ...d,
      blocks: Array.isArray(d.blocks) ? d.blocks : [],
      phases: Array.isArray(d.phases) ? d.phases : [],
      applications: Array.isArray(d.applications) ? d.applications : [],
    }),
  },
  {
    to: 7,
    description:
      'Forza: l’eseguito può avere la fatica percepita (`actual.rpe`, 1–10); nessun dato da convertire',
    // solo un campo facoltativo in più: le app più vecchie non devono importare file che lo contengono
    migrate: (d) => d,
  },
  {
    to: 8,
    description:
      'Fasi senza colore: via `color` da fasi e applicazioni (tutte con lo stesso colore neutro)',
    migrate: (d) => ({
      ...d,
      ...(Array.isArray(d.phases) && { phases: d.phases.map(dropColor) }),
      ...(Array.isArray(d.applications) && {
        applications: d.applications.map(dropColor),
      }),
    }),
  },
  {
    to: 9,
    description:
      'Impostazioni dell’utente (`settings`): fascia di volume settimanale per muscolo, di default 10–20 serie',
    migrate: (d) => ({
      ...d,
      settings: isObj(d.settings) ? d.settings : defaultSettings(),
    }),
  },
  {
    to: 10,
    description:
      'Import Garmin: attività importate (`imports`, vuoto), metriche estese e `garmin` nell’eseguito endurance, soglie per le zone nelle impostazioni (vuote)',
    migrate: (d) => ({
      ...d,
      imports: Array.isArray(d.imports) ? d.imports : [],
      ...(isObj(d.settings) && {
        settings: {
          ...d.settings,
          thresholds: isObj(d.settings.thresholds) ? d.settings.thresholds : {},
        },
      }),
    }),
  },
]

/** Versione attuale dello schema dei dati. */
export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].to

/** Porta i dati da `fromVersion` alla versione attuale (nessun effetto se è già attuale). */
export function migrate(data: RawData, fromVersion: number): RawData {
  return MIGRATIONS.filter((m) => m.to > fromVersion).reduce(
    (d, m) => m.migrate(d),
    data,
  )
}
