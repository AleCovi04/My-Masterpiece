import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n/context'
import {
  bucketsOf,
  choiceToPeriod,
  DEFAULT_CHOICE,
  granularityOf,
  parseChoice,
  planEntries,
  resolveRange,
  type Granularity,
  type PeriodChoice,
} from '../../lib/analysis'
import { parseIsoDate, todayIso } from '../../lib/dates'
import { formatLongDate } from '../../lib/format'
import { buildPlan } from '../../lib/plan'
import { readPreference, writePreference } from '../../lib/preferences'
import { useAnalysisData } from './useAnalysisData'
import LoadTab from './LoadTab'
import PeriodPicker from './PeriodPicker'
import StrengthTab from './StrengthTab'
import VolumeTab from './VolumeTab'
import '../overview/overview.css'
import '../planner/planner.css'
import './analysis.css'

type Tab = 'volumes' | 'load' | 'strength'
const TABS: Tab[] = ['volumes', 'load', 'strength']
const PERIOD_KEY = 'mm.analysisPeriod'
const GRAIN_KEY = 'mm.analysisGranularity'
const GRAINS: Granularity[] = ['day', 'week']

const readGrain = (): Granularity | null => {
  const v = readPreference(GRAIN_KEY)
  return v === 'day' || v === 'week' ? v : null
}

/** Analisi: volumi, carico e forza nel periodo scelto. */
export default function AnalysisPage() {
  const { t } = useI18n()
  const a = t.analysis
  const data = useAnalysisData()
  // l'ultimo periodo scelto resta su questo dispositivo
  const [choice, setChoice] = useState<PeriodChoice>(
    () => parseChoice(readPreference(PERIOD_KEY)) ?? DEFAULT_CHOICE,
  )
  // null = automatica (per giorno fino a 4 settimane); la scelta resta sul dispositivo
  const [grain, setGrain] = useState<Granularity | null>(readGrain)
  const [tab, setTab] = useState<Tab>('volumes')
  const today = todayIso()

  const changeChoice = (c: PeriodChoice) => {
    setChoice(c)
    writePreference(PERIOD_KEY, JSON.stringify(c))
  }

  const entries = useMemo(
    () =>
      data
        ? planEntries(buildPlan(data.applications, data.sessions, today))
        : [],
    [data, today],
  )
  const period = useMemo(
    () => choiceToPeriod(choice, entries, today),
    [choice, entries, today],
  )

  const view = useMemo(() => {
    if (!data) return null
    const range = resolveRange(period, data.sessions, today)
    const granularity = grain ?? granularityOf(range)
    const buckets = bucketsOf(range, granularity)
    const short = (iso: string) => {
      const d = parseIsoDate(iso)
      return `${d.getDate()} ${t.monthsShort[d.getMonth()]}`
    }
    const ticks = buckets.map((b) =>
      granularity === 'day' && buckets.length <= 31
        ? String(parseIsoDate(b.start).getDate())
        : short(b.start),
    )
    const titles = buckets.map((b) =>
      granularity === 'day'
        ? formatLongDate(b.start, t.monthsShort)
        : `${short(b.start)} – ${formatLongDate(b.end, t.monthsShort)}`,
    )
    const sessions = data.sessions.filter(
      (s) => s.date >= range.start && s.date <= range.end,
    )
    return { range, granularity, buckets, ticks, titles, sessions }
  }, [data, period, today, t, grain])

  return (
    <div className="ana">
      <h1 className="ana-title">{a.title}</h1>
      {view && (
        <PeriodPicker
          choice={choice}
          onChange={changeChoice}
          entries={entries}
          range={view.range}
          granularity={view.granularity}
        />
      )}
      <div className="ana-bar">
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
        {tab !== 'strength' && view && (
          <div className="seg" role="group" aria-label={a.granularity}>
            {GRAINS.map((g) => (
              <button
                type="button"
                key={g}
                aria-pressed={view.granularity === g}
                onClick={() => {
                  setGrain(g)
                  writePreference(GRAIN_KEY, g)
                }}
              >
                {a[g]}
              </button>
            ))}
          </div>
        )}
      </div>
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
      {view && data && tab === 'strength' && (
        <StrengthTab sessions={view.sessions} exercises={data.exercises} />
      )}
    </div>
  )
}
