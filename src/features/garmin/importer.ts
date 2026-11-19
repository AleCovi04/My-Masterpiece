// Import delle attività Garmin: dai byte (file o intervals.icu) alla seduta
// salvata, con il FIT originale in cache e poi sul server.
import { account, dataStore, refreshData } from '../../data'
import type { Id, ImportRecord, IsoDate, Session } from '../../data/types'
import type { FitActivity } from '../../lib/fit/types'
import {
  activityDate,
  applyImport,
  importCandidates,
} from '../../lib/garminImport'

export type ImportResult =
  | { status: 'imported'; date: IsoDate; sessionId: Id; created: boolean }
  /** Già importata (anche se la seduta è stata cancellata). */
  | { status: 'duplicate'; date: IsoDate }
  /** Non è corsa, bici o nuoto. */
  | { status: 'ignored' }
  /** Non è un file FIT leggibile. */
  | { status: 'invalid' }
  /** Import su una seduta precisa, ma l'attività è di un altro sport (o con altre frazioni). */
  | { status: 'mismatch'; date: IsoDate }
  /** L'utente ha annullato la scelta della seduta. */
  | { status: 'skipped'; date: IsoDate }

export interface ImportOptions {
  source: ImportRecord['source']
  intervalsId?: string
  /** Import dal dettaglio di una seduta: va solo lì. */
  targetId?: Id
  /**
   * Più sedute adatte: chiede quale. `null` = nuova seduta non pianificata,
   * `undefined` = annulla. Senza, si sceglie la prima.
   */
  choose?: (
    act: FitActivity,
    candidates: Session[],
  ) => Promise<Id | null | undefined>
}

const nowIso = () => new Date().toISOString()

/** Il FIT è compatibile con la seduta scelta (stesso sport o stesse frazioni)? */
function fits(session: Session, act: FitActivity): boolean {
  if (session.discipline === 'strength') return false
  if (session.discipline === 'brick')
    return (
      session.plan.legs.length === act.sessions.length &&
      session.plan.legs.every(
        (l, i) => l.discipline === act.sessions[i].discipline,
      )
    )
  return (
    act.sessions.length === 1 &&
    act.sessions[0].discipline === session.discipline
  )
}

/** Lettura dei FIT (con zip e SDK di Garmin): caricata solo quando serve. */
const fitDecoder = () => import('../../lib/fit/decode')

/** Importa un FIT già estratto. */
export { fitDecoder }

export async function importFit(
  bytes: Uint8Array,
  options: ImportOptions,
): Promise<ImportResult> {
  let act: FitActivity | null
  try {
    act = await (await fitDecoder()).readFit(bytes)
  } catch {
    return { status: 'invalid' }
  }
  if (!act) return { status: 'ignored' }
  const date = activityDate(act)
  const [sessions, imports] = await Promise.all([
    dataStore.loadSessions(),
    dataStore.loadImports(),
  ])
  if (imports.some((r) => r.id === act.key)) {
    // stessa attività arrivata da intervals.icu: si ricorda anche il suo id
    if (options.intervalsId) {
      const next = imports.map((r) =>
        r.id === act.key && !r.intervalsId
          ? { ...r, intervalsId: options.intervalsId, updatedAt: nowIso() }
          : r,
      )
      await dataStore.saveImports(next)
    }
    return { status: 'duplicate', date }
  }

  let target: Id | null
  if (options.targetId) {
    const s = sessions.find((x) => x.id === options.targetId)
    if (!s || !fits(s, act)) return { status: 'mismatch', date }
    target = s.id
  } else {
    const candidates = importCandidates(sessions, act)
    if (candidates.length === 0) target = null
    else if (candidates.length === 1 || !options.choose)
      target = candidates[0].id
    else {
      const picked = await options.choose(act, candidates)
      if (picked === undefined) return { status: 'skipped', date }
      target = picked
    }
  }

  // le sedute potrebbero essere cambiate durante la scelta
  const fresh = await dataStore.loadSessions()
  const out = applyImport(fresh, act, target, options.source, nowIso(), {
    intervalsId: options.intervalsId,
  })
  await dataStore.putFitFile(act.key, bytes)
  await dataStore.saveImport(out.sessions, [...imports, out.record])
  void account.uploadFitFiles()
  return {
    status: 'imported',
    date,
    sessionId: out.sessionId,
    created: out.created,
  }
}

/** Importa uno o più file scelti dall'utente (`.fit`, `.zip`, `.gz`). */
export async function importFiles(
  files: File[],
  options: ImportOptions,
): Promise<ImportResult[]> {
  const results: ImportResult[] = []
  for (const file of files) {
    let fits: Uint8Array[]
    try {
      const { extractFitFiles } = await fitDecoder()
      fits = extractFitFiles(new Uint8Array(await file.arrayBuffer()))
    } catch {
      results.push({ status: 'invalid' })
      continue
    }
    if (fits.length === 0) results.push({ status: 'invalid' })
    for (const bytes of fits) results.push(await importFit(bytes, options))
  }
  if (results.some((r) => r.status === 'imported')) refreshData()
  return results
}

/** Riepilogo degli esiti, per tipo. */
export function summarize(results: ImportResult[]) {
  const count = (s: ImportResult['status']) =>
    results.filter((r) => r.status === s).length
  return {
    imported: count('imported'),
    created: results.filter((r) => r.status === 'imported' && r.created).length,
    duplicate: count('duplicate'),
    ignored: count('ignored'),
    invalid: count('invalid'),
    mismatch: count('mismatch'),
    skipped: count('skipped'),
  }
}
