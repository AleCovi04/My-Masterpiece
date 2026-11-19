// Spazio sul server rispetto ai limiti del piano gratuito di Supabase.
// Procedura quando cresce: docs/spazio-dati.md.

export const MB = 1024 * 1024
/** Limiti del piano gratuito (del progetto: con più utenti si dividono). */
export const FREE_DB_BYTES = 500 * MB
export const FREE_STORAGE_BYTES = 1024 * MB
/** Ingombro di Postgres rispetto al JSON puro (righe, indici): stima prudente. */
export const DB_OVERHEAD = 2

export type SpaceLevel = 'ok' | 'warn' | 'high'

/** Sotto il 50 % tutto bene, fino all'80 % da tenere d'occhio, oltre da gestire. */
export function spaceLevel(used: number, limit: number): SpaceLevel {
  const ratio = limit > 0 ? used / limit : 0
  return ratio > 0.8 ? 'high' : ratio >= 0.5 ? 'warn' : 'ok'
}

/** Percentuale intera, al massimo 100 (per la barra). */
export const spacePct = (used: number, limit: number) =>
  limit > 0 ? Math.min(100, Math.round((100 * used) / limit)) : 0

/** "0,3 MB", "12 MB", "1,2 GB" (separatore decimale della lingua). */
export function formatBytes(bytes: number, lang: 'it' | 'en'): string {
  const fmt = (v: number, digits: number) =>
    v.toLocaleString(lang === 'it' ? 'it-IT' : 'en-GB', {
      maximumFractionDigits: digits,
    })
  if (bytes >= 1024 * MB) return `${fmt(bytes / (1024 * MB), 1)} GB`
  const mb = bytes / MB
  return `${fmt(mb, mb < 10 ? 1 : 0)} MB`
}

/** Stima dello spazio dei dati sul database dal JSON di export. */
export const estimateDbBytes = (jsonLength: number) => jsonLength * DB_OVERHEAD
