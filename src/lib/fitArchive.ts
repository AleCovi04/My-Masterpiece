// Archiviazione dei FIT vecchi (livello 2 di docs/spazio-dati.md): quali file,
// con che nome nello .zip, e lo .zip stesso.
import { zipSync } from 'fflate'
import type { ImportRecord, IsoDateTime, Session } from '../data/types'
import { toIsoDate } from './dates'

/** Età proposte, in anni. */
export const ARCHIVE_YEARS = [1, 2, 3] as const
export const DEFAULT_ARCHIVE_YEARS = 2

/** Data limite: le attività iniziate prima vanno in archivio. */
export function archiveCutoff(now: Date, years: number): IsoDateTime {
  const d = new Date(now)
  d.setFullYear(d.getFullYear() - years)
  return d.toISOString()
}

/** Attività con un FIT sul server, iniziate prima del limite e non ancora archiviate (dalla più vecchia). */
export function archiveCandidates(
  imports: ImportRecord[],
  cutoff: IsoDateTime,
): ImportRecord[] {
  return imports
    .filter((r) => !r.ignored && !r.archived && r.startedAt < cutoff)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
}

/** Nome del file nello .zip: "2026-11-19_run_<id>.fit" (data locale, sport della seduta). */
export function archiveEntryName(
  record: ImportRecord,
  sessions: Session[],
): string {
  const date = toIsoDate(new Date(record.startedAt))
  const sport =
    sessions.find((s) => s.id === record.sessionId)?.discipline ?? 'activity'
  const id = record.id.replace(/[^\w.-]/g, '_')
  return `${date}_${sport}_${id}.fit`
}

/** Lo .zip con i FIT originali, intatti. */
export function buildArchive(
  entries: { name: string; bytes: Uint8Array }[],
): Uint8Array {
  return zipSync(Object.fromEntries(entries.map((e) => [e.name, e.bytes])), {
    level: 6,
  })
}

/** Nome dello .zip scaricato: "my-masterpiece-fit-2024-11-19.zip" (data limite). */
export const archiveFileName = (cutoff: IsoDateTime) =>
  `my-masterpiece-fit-${toIsoDate(new Date(cutoff))}.zip`
