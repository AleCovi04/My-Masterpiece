// Garmin tramite intervals.icu: all'apertura dell'app (e al ritorno visibile)
// cerca le attività nello stesso giorno e sport di una seduta programmata e
// apre la finestra "Collega"; "Sincronizza Garmin" mostra anche le altre.
// Niente viene importato senza conferma.
import { useSyncExternalStore } from 'react'
import { dataStore, refreshData } from '../../data'
import type { Id } from '../../data/types'
import { addDays, toIsoDate } from '../../lib/dates'
import {
  ignoredImportId,
  proposeLinks,
  type LinkProposal,
} from '../../lib/garminLink'
import { fitDecoder, importFit, type ImportResult } from './importer'
import { downloadFile, IntervalsError, listActivities } from './intervals'

/** Giorni controllati all'apertura. */
const AUTO_DAYS = 14
/** Giorni mostrati da "Sincronizza Garmin". */
const MANUAL_DAYS = 30
/** Al ritorno visibile si ricontrolla al massimo ogni tanto. */
const AUTO_EVERY_MS = 30 * 60_000

type GarminError = 'notLinked' | 'auth' | 'offline'

interface GarminSyncState {
  running: boolean
  /** Finestra "Collega" aperta: `auto` = solo le attività con una seduta. */
  open: false | 'auto' | 'manual'
  rows: LinkProposal[]
  linking: boolean
  /** Esito dell'ultimo controllo o collegamento (per il tasto). */
  last?: {
    at: string
    error?: GarminError
    none?: boolean
    results?: ImportResult[]
  }
}

let state: GarminSyncState = {
  running: false,
  open: false,
  rows: [],
  linking: false,
}
const listeners = new Set<() => void>()
const set = (patch: Partial<GarminSyncState>) => {
  state = { ...state, ...patch }
  listeners.forEach((fn) => fn())
}

export function useGarminSync(): GarminSyncState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    () => state,
  )
}

/** Attività rimandate con "Più tardi": non riaprono la finestra fino al prossimo avvio. */
const snoozed = new Set<string>()
let lastAutoAt = 0

/**
 * Cerca le attività da collegare. `manual` = da "Sincronizza Garmin": ultimi
 * 30 giorni, anche quelle senza seduta, e la finestra si apre sempre (o dice
 * che non c'è niente). Automatico: ultimi 14 giorni, solo con una seduta,
 * finestra solo se serve.
 */
export async function checkGarmin(manual = false): Promise<void> {
  if (state.running || state.linking || state.open) return
  const link = await dataStore.loadIntervals()
  const now = new Date()
  if (!link) {
    if (manual) set({ last: { at: now.toISOString(), error: 'notLinked' } })
    return
  }
  if (!manual) {
    if (Date.now() - lastAutoAt < AUTO_EVERY_MS) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    lastAutoAt = Date.now()
  }

  set({ running: true })
  try {
    const days = manual ? MANUAL_DAYS : AUTO_DAYS
    const [list, sessions, imports] = await Promise.all([
      listActivities(
        link,
        toIsoDate(addDays(now, -days)),
        toIsoDate(addDays(now, 1)),
      ),
      dataStore.loadSessions(),
      dataStore.loadImports(),
    ])
    await dataStore.saveIntervals({ ...link, lastCheckAt: now.toISOString() })
    const all = proposeLinks(list, sessions, imports).reverse()
    const rows = manual
      ? all
      : all.filter((r) => r.target && !snoozed.has(r.activity.id))
    set({
      running: false,
      rows,
      open: rows.length ? (manual ? 'manual' : 'auto') : false,
      last: manual
        ? { at: now.toISOString(), none: rows.length === 0 }
        : state.last,
    })
  } catch (e) {
    set({
      running: false,
      ...(manual && {
        last: {
          at: now.toISOString(),
          error: e instanceof IntervalsError ? e.kind : 'offline',
        },
      }),
    })
  }
}

/** "Più tardi": chiude; all'apertura successiva dell'app la finestra torna. */
export function closeGarminLinks() {
  if (state.linking) return
  for (const r of state.rows) snoozed.add(r.activity.id)
  set({ open: false, rows: [] })
}

/** ✕: l'attività non viene più proposta (su tutti i dispositivi). */
export async function ignoreGarminActivity(row: LinkProposal): Promise<void> {
  const a = row.activity
  const now = new Date().toISOString()
  const id = ignoredImportId(a.id)
  await dataStore.update(['imports'], ({ imports }) =>
    imports.some((r) => r.id === id)
      ? null
      : {
          imports: [
            ...imports,
            {
              id,
              createdAt: now,
              updatedAt: now,
              source: 'intervals',
              intervalsId: a.id,
              startedAt: a.startUtc ?? `${row.date}T00:00:00.000Z`,
              ignored: true,
            },
          ],
        },
  )
  const rows = state.rows.filter((r) => r.activity.id !== a.id)
  set({ rows, open: rows.length ? state.open : false })
}

/** Una scelta della finestra: seduta esistente o `null` = nuova seduta. */
interface LinkChoice {
  row: LinkProposal
  target: Id | null
}

/** "Collega": scarica i file delle attività scelte e li importa dove indicato. */
export async function linkGarmin(choices: LinkChoice[]): Promise<void> {
  const link = await dataStore.loadIntervals()
  if (!link || state.linking) return
  // le attività non spuntate non riaprono la finestra fino al prossimo avvio
  for (const r of state.rows) snoozed.add(r.activity.id)
  set({ linking: true })
  const results: ImportResult[] = []
  let error: GarminError | undefined
  try {
    const { extractFitFiles } = await fitDecoder()
    for (const { row, target } of choices) {
      try {
        const files = extractFitFiles(await downloadFile(link, row.activity.id))
        if (!files.length) results.push({ status: 'invalid' })
        for (const bytes of files)
          results.push(
            await importFit(bytes, {
              source: 'intervals',
              intervalsId: row.activity.id,
              ...(target ? { targetId: target } : { forceNew: true }),
            }),
          )
      } catch (e) {
        // un'attività non scaricabile (es. arrivata da Strava) non ferma le altre
        if (e instanceof IntervalsError) throw e
        results.push({ status: 'invalid' })
      }
    }
  } catch (e) {
    error = e instanceof IntervalsError ? e.kind : 'offline'
  } finally {
    if (results.some((r) => r.status === 'imported')) refreshData()
    set({
      linking: false,
      open: false,
      rows: [],
      last: {
        at: new Date().toISOString(),
        results,
        ...(error && { error }),
      },
    })
  }
}
