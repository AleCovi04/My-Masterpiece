// "Sincronizza Garmin": porta nell'app le attività di intervals.icu che
// mancano. A mano dal Calendario, in automatico all'apertura (al massimo una
// volta all'ora).
import { useSyncExternalStore } from 'react'
import { dataStore, refreshData } from '../../data'
import { addDays, toIsoDate } from '../../lib/dates'
import { extractFitFiles } from '../../lib/fit/decode'
import { importFit, type ImportOptions, type ImportResult } from './importer'
import {
  downloadFile,
  IntervalsError,
  isEnduranceType,
  listActivities,
} from './intervals'

/** Giorni presi la prima volta. */
export const FIRST_SYNC_DAYS = 30
/** Ogni quanto al massimo il controllo automatico. */
export const AUTO_SYNC_MS = 60 * 60_000
/** Giorni ripresi a ogni controllo (attività caricate in ritardo su intervals.icu). */
const OVERLAP_DAYS = 3

export interface GarminSyncState {
  running: boolean
  /** Esito dell'ultima sincronizzazione (anche automatica). */
  last?: {
    at: string
    results: ImportResult[]
    error?: 'notLinked' | 'auth' | 'offline'
  }
}

let state: GarminSyncState = { running: false }
const listeners = new Set<() => void>()
const set = (next: GarminSyncState) => {
  state = next
  listeners.forEach((fn) => fn())
}

let chooser: ImportOptions['choose']
/** La finestra di scelta della seduta (montata nella cornice dell'app). */
export function setGarminChooser(fn: ImportOptions['choose']) {
  chooser = fn
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

/**
 * Sincronizza. `auto` = solo se collegati e se l'ultimo controllo ha più di
 * un'ora (nessun esito se non serve).
 */
export async function syncGarmin(auto = false): Promise<void> {
  if (state.running) return
  const link = await dataStore.loadIntervals()
  const now = new Date()
  if (!link) {
    if (!auto)
      set({
        running: false,
        last: { at: now.toISOString(), results: [], error: 'notLinked' },
      })
    return
  }
  if (
    auto &&
    link.lastCheckAt &&
    now.getTime() - Date.parse(link.lastCheckAt) < AUTO_SYNC_MS
  )
    return
  if (auto && typeof navigator !== 'undefined' && navigator.onLine === false)
    return

  set({ ...state, running: true })
  const results: ImportResult[] = []
  let error: 'auth' | 'offline' | undefined
  try {
    const oldest = link.lastCheckAt
      ? addDays(new Date(link.lastCheckAt), -OVERLAP_DAYS)
      : addDays(now, -FIRST_SYNC_DAYS)
    const list = await listActivities(
      link,
      toIsoDate(oldest),
      toIsoDate(addDays(now, 1)),
    )
    const known = new Set(
      (await dataStore.loadImports()).map((r) => r.intervalsId).filter(Boolean),
    )
    const todo = list
      .filter((a) => !known.has(a.id) && isEnduranceType(a.type))
      .sort((a, b) =>
        (a.start_date_local ?? '').localeCompare(b.start_date_local ?? ''),
      )
    for (const a of todo) {
      try {
        const files = extractFitFiles(await downloadFile(link, a.id))
        for (const bytes of files)
          results.push(
            await importFit(bytes, {
              source: 'intervals',
              intervalsId: a.id,
              choose: chooser,
            }),
          )
      } catch (e) {
        // un'attività non scaricabile (es. arrivata da Strava) non ferma le altre
        if (e instanceof IntervalsError && e.kind === 'offline') throw e
        results.push({ status: 'invalid' })
      }
    }
    await dataStore.saveIntervals({ ...link, lastCheckAt: now.toISOString() })
  } catch (e) {
    error = e instanceof IntervalsError ? e.kind : 'offline'
  } finally {
    if (results.some((r) => r.status === 'imported')) refreshData()
    set({
      running: false,
      last: { at: now.toISOString(), results, ...(error && { error }) },
    })
  }
}
