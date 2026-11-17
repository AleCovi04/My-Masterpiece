// Nomi e valori dei record di forza (riepilogo live e Analisi).
import type { RecordMetric, SetRef } from '../lib/strengthRecords'
import type { Dictionary } from './it'

/** Nome di una metrica: "Peso massimo", "Record a 6 rip.", "Volume max in una serie"… */
export function recordLabel(metric: RecordMetric, t: Dictionary): string {
  const r = t.records
  if (metric === 'maxKg') return r.maxKg
  if (metric === 'setVolume') return r.setVolume
  if (metric === 'sessionVolume') return r.sessionVolume
  return r.reps.replace('{n}', metric.slice(1))
}

/** Le metriche di volume si leggono in kg interi, le altre con due decimali. */
export const isVolumeMetric = (m: RecordMetric) =>
  m === 'setVolume' || m === 'sessionVolume'

/** Valore con unità ("85 kg", "1.890 kg"). */
export function recordValue(
  metric: RecordMetric,
  value: number,
  lang: string,
): string {
  const digits = isVolumeMetric(metric) ? 0 : 2
  return `${value.toLocaleString(lang, { maximumFractionDigits: digits })} kg`
}

/** La serie del record ("82,5 × 10"). */
export const setText = (s: SetRef, lang: string) =>
  `${s.kg.toLocaleString(lang, { maximumFractionDigits: 2 })} × ${s.reps}`
