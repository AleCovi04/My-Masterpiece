import type { EnduranceDiscipline } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { formatClock } from '../../lib/enduranceTemplate'
import type { FitSession } from '../../lib/fit/types'
import { distText, speedText } from './format'

export interface Row {
  n: number
  distanceM: number
  durationS: number
  avgHr?: number
  avgPowerW?: number
  elevationM?: number
  cadence?: number
}

export function SplitTable({
  d,
  rows,
}: {
  d: EnduranceDiscipline
  rows: Row[]
}) {
  const { t } = useI18n()
  const g = t.garmin
  const has = (k: keyof Row) => rows.some((r) => r[k] !== undefined)
  const fastest = Math.max(
    ...rows.map((r) => (r.durationS ? r.distanceM / r.durationS : 0)),
  )
  return (
    <div className="gm-table-wrap">
      <table className="gm-table">
        <thead>
          <tr>
            <th>{g.colN}</th>
            <th>{g.colDist}</th>
            <th>{g.colTime}</th>
            <th>{d === 'bike' ? g.colSpeed : g.colPace}</th>
            {has('avgHr') && <th>{g.colHr}</th>}
            {has('avgPowerW') && <th>{g.colPower}</th>}
            {has('cadence') && <th>{g.colCad}</th>}
            {d !== 'swim' && has('elevationM') && <th>{g.colElev}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const v = r.durationS ? r.distanceM / r.durationS : 0
            return (
              <tr key={r.n}>
                <td>{r.n}</td>
                <td>{distText(r.distanceM, d)}</td>
                <td>{formatClock(r.durationS)}</td>
                <td className="gm-bar-cell">
                  <span
                    className="gm-bar"
                    style={{ width: `${fastest ? (v / fastest) * 100 : 0}%` }}
                  />
                  <span>{v ? speedText(v, d) : '—'}</span>
                </td>
                {has('avgHr') && (
                  <td>{r.avgHr !== undefined ? Math.round(r.avgHr) : '—'}</td>
                )}
                {has('avgPowerW') && (
                  <td>
                    {r.avgPowerW !== undefined ? Math.round(r.avgPowerW) : '—'}
                  </td>
                )}
                {has('cadence') && <td>{r.cadence ?? '—'}</td>}
                {d !== 'swim' && has('elevationM') && (
                  <td>
                    {r.elevationM !== undefined
                      ? `${r.elevationM > 0 ? '+' : ''}${r.elevationM}`
                      : '—'}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function Lengths({ s }: { s: FitSession }) {
  const { t } = useI18n()
  const g = t.garmin
  // numero della vasca (le pause non contano)
  const numbers = s.lengths.reduce<number[]>(
    (acc, l) => [...acc, (acc[acc.length - 1] ?? 0) + (l.active ? 1 : 0)],
    [],
  )
  return (
    <section className="gm-sec">
      <h2>{g.swimLengths}</h2>
      <div className="gm-table-wrap">
        <table className="gm-table">
          <thead>
            <tr>
              <th>{g.colN}</th>
              <th>{g.colTime}</th>
              <th>{g.strokes}</th>
              <th>SWOLF</th>
            </tr>
          </thead>
          <tbody>
            {s.lengths.map((l, i) => {
              if (!l.active)
                return (
                  <tr key={i} className="gm-rest">
                    <td />
                    <td>{formatClock(Math.round(l.durationS))}</td>
                    <td colSpan={2}>{g.rest}</td>
                  </tr>
                )
              const stroke = l.stroke
                ? (g.stroke as Record<string, string>)[l.stroke]
                : undefined
              return (
                <tr key={i}>
                  <td>
                    {numbers[i]}
                    {stroke && <small> · {stroke}</small>}
                  </td>
                  <td>{formatClock(Math.round(l.durationS))}</td>
                  <td>{l.strokes ?? '—'}</td>
                  <td>
                    {l.strokes !== undefined
                      ? Math.round(l.durationS + l.strokes)
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
