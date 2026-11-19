import { useMemo, useState } from 'react'
import RpeScale from '../../components/ui/RpeScale'
import type { Id, IsoDate, Session, Sport } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { formatHoursShort } from '../../lib/format'
import { timeSeries, type Bucket, type Range } from '../../lib/analysis'
import { parseIsoDate } from '../../lib/dates'
import { formatLongDate } from '../../lib/format'
import {
  ACWR_SCALE_MAX,
  ACWR_ZONES,
  acwrZone,
  fitnessFatigue,
  freshnessZone,
  loadBySport,
  loadStatus,
  missingRpe,
  type AcwrZone,
  type FreshnessZone,
} from '../../lib/load'
import { DISCIPLINES } from '../../lib/weekStats'
import FilterChips, { NoSeries } from '../../components/ui/FilterChips'
import BarChart, { PlannedKey } from './BarChart'
import LineChart from './LineChart'

interface Props {
  /** Tutte le sedute: gli indicatori tengono conto dello storico. */
  allSessions: Session[]
  /** Le sedute del periodo. */
  sessions: Session[]
  range: Range
  /** Asse per settimana del periodo. */
  weeks: { buckets: Bucket[]; ticks: string[]; titles: string[] }
  today: IsoDate
  onSetRpe: (id: Id, rpe: number) => void
}

/** Colori delle zone, dalle variabili del tema. */
const ACWR_COLOR: Record<AcwrZone, string> = {
  low: 'var(--planned)',
  safe: 'var(--ok)',
  caution: 'var(--warn)',
  high: 'var(--miss)',
}
const FRESH_COLOR: Record<FreshnessZone, string> = {
  fresh: 'var(--muted)',
  neutral: 'var(--muted)',
  productive: 'var(--ok)',
  overload: 'var(--miss)',
}

const int = (v: number) => String(Math.round(v))
const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v)}`

/** Carico: progressione (ACWR), freschezza, carico e ore per settimana, tendenza della forma. */
export default function LoadTab({
  allSessions,
  sessions,
  range,
  weeks,
  today,
  onSetRpe,
}: Props) {
  const { t, lang } = useI18n()
  const a = t.analysis
  const [shown, setShown] = useState<Sport[]>(DISCIPLINES)
  // gli indicatori si leggono all'ultimo giorno del periodo, mai oltre oggi
  const ref = range.end < today ? range.end : today
  const status = useMemo(() => loadStatus(allSessions, ref), [allSessions, ref])
  const missing = useMemo(
    () => missingRpe(sessions.filter((s) => s.date <= ref)),
    [sessions, ref],
  )

  const perWeek = useMemo(
    () =>
      weeks.buckets.map((b) =>
        loadBySport(
          sessions.filter((s) => s.date >= b.start && s.date <= b.end),
        ),
      ),
    [sessions, weeks.buckets],
  )
  const hours = useMemo(
    () => timeSeries(sessions, weeks.buckets),
    [sessions, weeks.buckets],
  )
  const points = useMemo(
    () =>
      range.start <= ref ? fitnessFatigue(allSessions, range.start, ref) : [],
    [allSessions, range.start, ref],
  )
  const dayTicks = points.map((p) => {
    const d = parseIsoDate(p.date)
    return `${d.getDate()} ${t.monthsShort[d.getMonth()]}`
  })
  const pct = (v: number) => `${signed(Math.round(v))}%`

  return (
    <div className="ana-grid">
      {missing.length > 0 && (
        <MissingRpe sessions={missing} onSetRpe={onSetRpe} />
      )}

      <div className="ld-duo">
        <section className="panel">
          <h3>{a.acwrTitle}</h3>
          {!status.enough ? (
            <Insufficient days={status.historyDays} />
          ) : status.acwr === null ? (
            <p className="note">{a.acwrNoChronic}</p>
          ) : (
            <>
              <AcwrGauge value={status.acwr} lang={lang} />
              <p className="ld-sentence">
                {a.acwrSentence
                  .replace(
                    '{when}',
                    ref === today
                      ? a.thisWeek
                      : a.weekTo.replace(
                          '{date}',
                          formatLongDate(ref, t.monthsShort),
                        ),
                  )
                  .replace('{pct}', pct((status.acwr - 1) * 100))
                  .replace(
                    '{zone}',
                    a.acwrZone[acwrZone(status.acwr)].toLowerCase(),
                  )}
              </p>
            </>
          )}
          <p className="note ana-legend">{a.acwrHow}</p>
        </section>

        <section className="panel">
          <h3>{a.freshTitle}</h3>
          {!status.enough ? (
            <Insufficient days={status.historyDays} />
          ) : status.freshnessPct === null ? (
            <p className="note">{a.acwrNoChronic}</p>
          ) : (
            (() => {
              const z = freshnessZone(status.freshnessPct)
              return (
                <div className="ld-state">
                  <p>
                    <i style={{ background: FRESH_COLOR[z] }} />
                    <b>{a.freshZone[z]}</b>
                    <small>{pct(status.freshnessPct)}</small>
                  </p>
                  <span>{a.freshHint[z]}</span>
                </div>
              )
            })()
          )}
          <p className="note ana-legend">{a.freshHow}</p>
        </section>
      </div>

      <section className="panel">
        <h3>{a.loadTitle}</h3>
        <FilterChips
          size="sm"
          label={a.loadTitle}
          items={DISCIPLINES.map((d) => ({
            key: d,
            label: t.discipline[d],
            color: `var(--${d})`,
          }))}
          active={shown}
          onChange={setShown}
        />
        {shown.length === 0 ? (
          <NoSeries />
        ) : (
          <BarChart
            label={a.loadTitle}
            ticks={weeks.ticks}
            titles={weeks.titles}
            stacks={shown.map((d) => ({
              key: d,
              label: t.discipline[d],
              color: `var(--${d})`,
              values: perWeek.map((l) => l[d]),
            }))}
            totalLabel={a.total}
            format={int}
          />
        )}
        <p className="note ana-legend">{a.loadHow}</p>
      </section>

      <section className="panel">
        <h3>{a.hoursTitle}</h3>
        <BarChart
          label={a.hoursTitle}
          ticks={weeks.ticks}
          titles={weeks.titles}
          stacks={[
            {
              key: 'actual',
              label: a.actual,
              color: 'var(--accent)',
              values: hours.map(
                (x) => DISCIPLINES.reduce((s, d) => s + x[d].actualS, 0) / 3600,
              ),
            },
          ]}
          planned={hours.map(
            (x) => DISCIPLINES.reduce((s, d) => s + x[d].plannedS, 0) / 3600,
          )}
          plannedLabel={a.planned}
          format={formatHoursShort}
        />
        <p className="note ana-legend">
          {a.legendBars} · <PlannedKey /> {a.legendDash}
        </p>
      </section>

      <section className="panel">
        <div className="ld-head">
          <h3>{a.formTitle}</h3>
          {status.enough && (
            <span className="ld-trend" data-trend={status.trend}>
              {status.trend === 'up'
                ? '↗'
                : status.trend === 'down'
                  ? '↘'
                  : '→'}{' '}
              {a.trend[status.trend]}
            </span>
          )}
        </div>
        <LineChart
          label={a.formTitle}
          ticks={dayTicks}
          titles={points.map((p) => formatLongDate(p.date, t.monthsShort))}
          series={[
            {
              key: 'fitness',
              label: a.fitness,
              color: 'var(--ok)',
              values: points.map((p) => p.fitness),
            },
          ]}
          format={int}
          hideValues
        />
        <p className="note ana-legend">{a.trendHow}</p>
      </section>

      <p className="note ld-disclaimer">{a.loadDisclaimer}</p>
    </div>
  )
}

function Insufficient({ days }: { days: number }) {
  const { t } = useI18n()
  return (
    <div className="ld-state">
      <p>
        <b>{t.analysis.insufficient}</b>
      </p>
      <span>{t.analysis.insufficientHow.replace('{n}', String(days))}</span>
    </div>
  )
}

/** Barra a zone con la lancetta sul valore. */
function AcwrGauge({ value, lang }: { value: number; lang: string }) {
  const { t } = useI18n()
  const at = (v: number) => (Math.min(v, ACWR_SCALE_MAX) / ACWR_SCALE_MAX) * 100
  const zone = acwrZone(value)
  return (
    <div className="ld-gauge">
      <div className="ld-value">
        <b style={{ color: ACWR_COLOR[zone] }}>{t.analysis.acwrZone[zone]}</b>
        <small>
          {value.toLocaleString(lang, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </small>
      </div>
      <div className="ld-bar" role="img" aria-label={t.analysis.acwrZone[zone]}>
        {ACWR_ZONES.map((z, k) => {
          const left = at(k === 0 ? 0 : ACWR_ZONES[k - 1].max)
          const right = at(z.max)
          return (
            <span
              key={z.key}
              style={{
                left: `${left}%`,
                width: `${right - left}%`,
                background: ACWR_COLOR[z.key],
              }}
            />
          )
        })}
        <i style={{ left: `${at(value)}%` }} />
      </div>
      <div className="ld-scale">
        {ACWR_ZONES.slice(0, -1).map((z) => (
          <small key={z.key} style={{ left: `${at(z.max)}%` }}>
            {z.max.toLocaleString(lang)}
          </small>
        ))}
      </div>
    </div>
  )
}

/** Avviso delle sedute senza RPE, con la scala per aggiungerlo subito. */
function MissingRpe({
  sessions,
  onSetRpe,
}: {
  sessions: Session[]
  onSetRpe: (id: Id, rpe: number) => void
}) {
  const { t } = useI18n()
  const a = t.analysis
  const [open, setOpen] = useState(false)
  const sorted = [...sessions].sort((x, y) => (x.date < y.date ? 1 : -1))
  return (
    <section className="panel ld-missing">
      <button
        type="button"
        className="ld-missing-head"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>
          {sessions.length === 1
            ? a.missingRpeOne
            : a.missingRpe.replace('{n}', String(sessions.length))}
        </span>
        <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      <p className="note ana-legend">{a.missingRpeHow}</p>
      {open && (
        <ul className="ld-missing-list">
          {sorted.map((s) => (
            <li key={s.id}>
              <span>
                <b>{s.name || t.discipline[s.discipline]}</b>{' '}
                <small>{formatLongDate(s.date, t.monthsShort)}</small>
              </span>
              <RpeScale value={null} onChange={(r) => onSetRpe(s.id, r)} bare />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
