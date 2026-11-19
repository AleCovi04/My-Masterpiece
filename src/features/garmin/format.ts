// Testi delle metriche delle attività Garmin.
import type { EnduranceDiscipline } from '../../data/types'
import { formatClock } from '../../lib/enduranceTemplate'

/** Passo (corsa /km, nuoto /100 m) o velocità (bici km/h) da m/s. */
export function speedText(mps: number, d: EnduranceDiscipline): string {
  if (d === 'bike') return `${(mps * 3.6).toFixed(1)} km/h`
  if (mps <= 0) return '—'
  const per = d === 'run' ? 1000 : 100
  return `${formatClock(Math.round(per / mps))}/${d === 'run' ? 'km' : '100 m'}`
}

/** Velocità media da distanza e tempo. */
export const avgSpeed = (distanceM?: number, durationS?: number) =>
  distanceM && durationS ? distanceM / durationS : undefined

/** Distanza: nuoto in metri, il resto in km (2 decimali). */
export function distText(m: number, d: EnduranceDiscipline): string {
  if (d === 'swim') return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(2)} km`
}

/** Etichetta dell'asse X: tempo (h:mm:ss) o distanza (km o m). */
export function axisText(
  x: number,
  axis: 'time' | 'distance',
  d: EnduranceDiscipline,
): string {
  if (axis === 'time') return formatClock(Math.round(x))
  if (d === 'swim') return `${Math.round(x)} m`
  return `${+(x / 1000).toFixed(x >= 10000 ? 0 : 1)} km`
}
