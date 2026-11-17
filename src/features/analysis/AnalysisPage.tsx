import { useMemo, useState } from 'react'
import type { IsoDate } from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  bucketsOf,
  granularityOf,
  resolveRange,
  type Period,
} from '../../lib/analysis'
import { parseIsoDate, todayIso } from '../../lib/dates'
import { formatLongDate } from '../../lib/format'
import { buildPlan } from '../../lib/plan'
import { useAnalysisData } from './useAnalysisData'
import LoadTab from './LoadTab'
import VolumeTab from './VolumeTab'
import '../overview/overview.css'
import './analysis.css'

type Tab = 'volumes' | 'load' | 'strength'
const TABS: Tab[] = ['volumes', 'load', 'strength']
const WEEKS = [4, 12, 26]

interface PlanOption {
  value: string
  label: string
  start: IsoDate
  end: IsoDate
}

/** Analisi: volumi, carico e forza nel periodo scelto. */
export default function AnalysisPage() {
  const { t } = useI18n()
  const a = t.analysis
  const data = useAnalysisData()
  const [periodKey, setPeriodKey] = useState('w12')
  const [tab, setTab] = useState<Tab>('volumes')
  const today = todayIso()

  // fasi e blocchi del Piano (con i blocchi dentro ogni fase)
  const planOptions = useMemo<PlanOption[]>(() => {
    if (!data) return []
    const short = (d: IsoDate) => formatLongDate(d, t.monthsShort)
    return buildPlan(data.applications, data.sessions, today).flatMap(
      (item) => {
        const kind =
          item.application.kind === 'phase' ? t.plan.phase : t.plan.block
        const head: PlanOption = {
          value: `a:${item.application.id}`,
          label: `${kind} · ${item.application.name} (${short(item.start)})`,
          start: item.start,
          end: item.end,
        }
        if (item.application.kind !== 'phase') return [head]
        return [
          head,
          ...item.runs.map((r) => ({
            value: `r:${r.key}`,
            label: `— ${r.blockName} (${short(r.start)})`,
            start: r.start,
            end: r.end,
          })),
        ]
      },
    )
  }, [data, today, t])

  const period: Period = useMemo(() => {
    if (periodKey === 'all') return { kind: 'all' }
    if (periodKey.startsWith('w'))
      return { kind: 'weeks', weeks: +periodKey.slice(1) }
    const o = planOptions.find((p) => p.value === periodKey)
    return o
      ? { kind: 'range', start: o.start, end: o.end }
      : { kind: 'weeks', weeks: 12 }
  }, [periodKey, planOptions])

  const view = useMemo(() => {
    if (!data) return null
    const range = resolveRange(period, data.sessions, today)
    const granularity = granularityOf(range)
    const buckets = bucketsOf(range, granularity)
    const ticks = buckets.map((b) => {
      const d = parseIsoDate(b.start)
      return granularity === 'day'
        ? String(d.getDate())
        : `${d.getDate()} ${t.monthsShort[d.getMonth()]}`
    })
    const titles = buckets.map((b) =>
      granularity === 'day'
        ? formatLongDate(b.start, t.monthsShort)
        : a.weekOf.replace('{d}', formatLongDate(b.start, t.monthsShort)),
    )
    const sessions = data.sessions.filter(
      (s) => s.date >= range.start && s.date <= range.end,
    )
    return { range, granularity, buckets, ticks, titles, sessions }
  }, [data, period, today, t, a])

  return (
    <div className="ana">
      <h1 className="ana-title">{a.title}</h1>
      <div className="ana-bar">
        <label className="ana-period">
          <span>{a.period}</span>
          <select
            className="pl-inp"
            value={periodKey}
            onChange={(e) => setPeriodKey(e.target.value)}
          >
            {WEEKS.map((w) => (
              <option key={w} value={`w${w}`}>
                {a.lastWeeks.replace('{n}', String(w))}
              </option>
            ))}
            <option value="all">{a.all}</option>
            {planOptions.length > 0 && (
              <optgroup label={a.fromPlan}>
                {planOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        <div className="seg" role="group" aria-label={a.tabs}>
          {TABS.map((k) => (
            <button
              type="button"
              key={k}
              aria-pressed={tab === k}
              onClick={() => setTab(k)}
            >
              {a[k]}
            </button>
          ))}
        </div>
      </div>
      {view && view.range && (
        <p className="note ana-range">
          {formatLongDate(view.range.start, t.monthsShort)} –{' '}
          {formatLongDate(view.range.end, t.monthsShort)} ·{' '}
          {view.granularity === 'day' ? a.byDay : a.byWeek}
        </p>
      )}
      {view && tab === 'volumes' && (
        <VolumeTab
          sessions={view.sessions}
          buckets={view.buckets}
          ticks={view.ticks}
          titles={view.titles}
        />
      )}
      {view && data && tab === 'load' && (
        <LoadTab
          allSessions={data.sessions}
          sessions={view.sessions}
          range={view.range}
          buckets={view.buckets}
          ticks={view.ticks}
          titles={view.titles}
          today={today}
        />
      )}
      {view && tab === 'strength' && (
        <section className="panel">
          <h3>{a[tab]}</h3>
          <p className="note">{a.soon}</p>
        </section>
      )}
    </div>
  )
}
