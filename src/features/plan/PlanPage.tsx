import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlanIcon, TrashIcon } from '../../components/ui/Icons'
import { dataStore, useDataRevision } from '../../data'
import type { IsoDate, Phase, TrainingBlock } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { blockWeeks, phaseWeeks } from '../../lib/blocks'
import { todayIso } from '../../lib/dates'
import { formatDuration, formatLongDate } from '../../lib/format'
import {
  buildPlan,
  raceInfo,
  type PlanItem,
  type Progress,
  type Timing,
} from '../../lib/plan'
import Modal from '../../components/ui/Modal'
import { usePlanning } from '../forger/usePlanning'
import AddToPlanDialog from './AddToPlanDialog'
import ApplyDialog from './ApplyDialog'
import '../forger/planner.css'
import './plan.css'

type Pick =
  { kind: 'phase'; phase: Phase } | { kind: 'block'; block: TrainingBlock }

/** Il Piano: fasi e blocchi messi in calendario, con l'andamento fino alla gara. */
export default function PlanPage() {
  const { t } = useI18n()
  const pl = t.plan
  const planning = usePlanning()
  const navigate = useNavigate()
  const [raceDate, setRaceDate] = useState<IsoDate | null>(null)
  const [adding, setAdding] = useState(false)
  const [pick, setPick] = useState<Pick | null>(null)
  const today = todayIso()

  const revision = useDataRevision()
  useEffect(() => {
    let cancelled = false
    void dataStore.loadRaceDate().then((d) => {
      if (!cancelled) setRaceDate(d)
    })
    return () => {
      cancelled = true
    }
  }, [revision])

  const items = useMemo(
    () => buildPlan(planning.applications, planning.sessions, today),
    [planning.applications, planning.sessions, today],
  )
  const race = raceInfo(items, today, raceDate)
  const date = (iso: IsoDate) => formatLongDate(iso, t.monthsShort)

  if (planning.loading) return null

  return (
    <div className="pn">
      <div className="pn-head">
        <h1 className="pl-title">{pl.title}</h1>
        <button
          type="button"
          className="pl-btn acc"
          onClick={() => setAdding(true)}
        >
          + {pl.add}
        </button>
      </div>
      <p className="pn-sub">{pl.subtitle}</p>

      {items.length === 0 ? (
        <div className="ph">{pl.empty}</div>
      ) : (
        <ol className="pn-list">
          {items.map((it) => (
            <PlanCard
              key={it.application.id}
              item={it}
              onOpenWeek={(start) => navigate(`/calendario?settimana=${start}`)}
              onRemove={() => planning.unapply(it.application.id)}
            />
          ))}
        </ol>
      )}

      {raceDate && (
        <div className="pn-race">
          <span className="pn-flag" aria-hidden="true">
            <PlanIcon />
          </span>
          <div>
            <b>
              {pl.race} · {date(raceDate)}
            </b>
            {race ? (
              <small>
                {pl.weeksToRace.replace('{n}', String(race.weeksToRace))}
                {race.uncovered > 0 &&
                  ` · ${pl.uncovered.replace('{n}', String(race.uncovered))}`}
              </small>
            ) : (
              <small>{pl.racePast}</small>
            )}
          </div>
        </div>
      )}

      {adding && (
        <AddToPlanDialog
          phases={planning.phases}
          blocks={planning.blocks}
          onPick={(p) => {
            setAdding(false)
            setPick(p)
          }}
          onClose={() => setAdding(false)}
        />
      )}

      {pick && (
        <ApplyDialog
          kind={pick.kind}
          sourceId={pick.kind === 'phase' ? pick.phase.id : pick.block.id}
          name={pick.kind === 'phase' ? pick.phase.name : pick.block.name}
          weeks={
            pick.kind === 'phase'
              ? phaseWeeks(pick.phase, planning.blocks)
              : blockWeeks(pick.block)
          }
          templates={planning.templates}
          sessions={planning.sessions}
          onApply={planning.apply}
          onClose={() => setPick(null)}
        />
      )}
    </div>
  )
}

function ProgressBar({ p }: { p: Progress }) {
  return (
    <span className="pn-bar" aria-hidden="true">
      <i style={{ width: `${p.pct}%` }} />
    </span>
  )
}

function PlanCard({
  item,
  onOpenWeek,
  onRemove,
}: {
  item: PlanItem
  onOpenWeek: (start: IsoDate) => void
  onRemove: () => Promise<number> | void
}) {
  const { t } = useI18n()
  const pl = t.plan
  const a = item.application
  const [open, setOpen] = useState(item.timing === 'current')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const date = (iso: IsoDate) => formatLongDate(iso, t.monthsShort)
  const shortDate = (iso: IsoDate) => {
    const [, m, d] = iso.split('-').map(Number)
    return `${d} ${t.monthsShort[m - 1]}`
  }
  const timingLabel: Record<Timing, string> = {
    past: pl.past,
    current: pl.current,
    future: pl.future,
  }
  const stats = (p: Progress) =>
    [
      `${p.done}/${p.total} ${pl.sessions}`,
      p.skipped > 0 ? `${p.skipped} ${pl.skipped}` : null,
      p.plannedS > 0 || p.doneS > 0
        ? `${formatDuration(p.doneS)} / ${formatDuration(p.plannedS)}`
        : null,
    ]
      .filter(Boolean)
      .join(' · ')
  const pending =
    item.progress.total - item.progress.done - item.progress.skipped

  return (
    <li className={`pn-card ${item.timing}`}>
      <button
        type="button"
        className="pn-card-h"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="pn-top">
          <span className="pn-kind">
            {a.kind === 'phase' ? pl.phase : pl.block}
          </span>
          <span className={`pn-timing ${item.timing}`}>
            {timingLabel[item.timing]}
          </span>
        </span>
        <b className="pn-name">{a.name}</b>
        <small className="pn-dates">
          {date(item.start)} – {date(item.end)} · {a.weeks.length}{' '}
          {t.blocks.weeksCount}
        </small>
        <b className="pn-pct">{item.progress.pct}%</b>
        <ProgressBar p={item.progress} />
        <small className="pn-stats">{stats(item.progress)}</small>
      </button>
      <button
        type="button"
        className="pn-trash"
        aria-label={pl.remove}
        title={pl.remove}
        onClick={() => setConfirming(true)}
      >
        <TrashIcon />
      </button>

      {open && (
        <div className="pn-body">
          {item.runs.map((r) => (
            <section key={r.key} className="pn-run">
              <div className="pn-run-h">
                <b>{r.blockName}</b>
                <small>
                  {shortDate(r.start)} – {shortDate(r.end)} · {r.progress.pct}%
                </small>
              </div>
              <ul className="pn-weeks">
                {r.weeks.map((w) => (
                  <li key={w.start}>
                    <button
                      type="button"
                      className={`pn-week ${w.timing}`}
                      onClick={() => onOpenWeek(w.start)}
                      aria-label={`${pl.openWeek}: ${shortDate(w.start)}`}
                    >
                      <span className="pn-wk">
                        {t.calendar.weekShort} {w.index}
                        {a.kind === 'phase' && (
                          <small>
                            {r.blockName} {w.week}/{w.weeks}
                          </small>
                        )}
                      </span>
                      <span className="pn-wdates">
                        {shortDate(w.start)} – {shortDate(w.end)}
                      </span>
                      <ProgressBar p={w.progress} />
                      <span className="pn-wstats">
                        {w.progress.done}/{w.progress.total}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {confirming && (
        <Modal
          title={pl.remove}
          closeLabel={pl.close}
          onClose={() => setConfirming(false)}
        >
          <p className="pn-confirm">
            <b>{a.name}</b>
            <br />
            {pl.removeConfirm.replace('{n}', String(pending))}
          </p>
          <div className="pl-actions">
            <button
              type="button"
              className="pl-btn warn"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await onRemove()
                } finally {
                  setBusy(false)
                  setConfirming(false)
                }
              }}
            >
              {pl.confirmYes}
            </button>
            <button
              type="button"
              className="pl-btn"
              onClick={() => setConfirming(false)}
            >
              {pl.cancel}
            </button>
          </div>
        </Modal>
      )}
    </li>
  )
}
