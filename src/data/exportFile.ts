// File di export/import: tutti i dati in un JSON con versione dello schema e data.
import { migrate, SCHEMA_VERSION } from './migrations'
import type { AppData, DataCounts, IsoDateTime } from './types'
import { countData, isRawData, sanitize } from './validate'

export const EXPORT_APP_ID = 'my-masterpiece'

export interface ExportFile {
  app: typeof EXPORT_APP_ID
  schemaVersion: number
  exportedAt: IsoDateTime
  data: AppData
}

export function buildExportFile(data: AppData, now: Date): ExportFile {
  return {
    app: EXPORT_APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data,
  }
}

/** "my-masterpiece-2026-11-16.json" */
export function exportFileName(now: Date): string {
  return `${EXPORT_APP_ID}-${now.toISOString().slice(0, 10)}.json`
}

export type ImportError =
  /** Non è JSON o non è un export di questa app. */
  | 'invalid'
  /** Creato da una versione più recente dell'app. */
  | 'newer'

export type ImportResult =
  | {
      ok: true
      /** Dati già migrati alla versione attuale e validati. */
      data: AppData
      counts: DataCounts
      /** Versione dello schema scritta nel file. */
      fromVersion: number
      exportedAt: IsoDateTime | null
      /** Elementi non validi, scartati. */
      dropped: number
    }
  | { ok: false; error: ImportError }

/** Valida il testo di un file di export e lo porta alla versione attuale. Non salva nulla. */
export function parseImportFile(text: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'invalid' }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'invalid' }
  }
  const file = parsed as Partial<ExportFile>
  const version = file.schemaVersion
  if (
    file.app !== EXPORT_APP_ID ||
    typeof version !== 'number' ||
    !Number.isInteger(version) ||
    version < 0 ||
    !isRawData(file.data)
  ) {
    return { ok: false, error: 'invalid' }
  }
  if (version > SCHEMA_VERSION) return { ok: false, error: 'newer' }
  try {
    const { data, dropped } = sanitize(migrate(file.data, version))
    return {
      ok: true,
      data,
      counts: countData(data),
      fromVersion: version,
      exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : null,
      dropped,
    }
  } catch {
    return { ok: false, error: 'invalid' }
  }
}
