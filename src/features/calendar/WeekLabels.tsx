import { useState } from 'react'
import type { BlockApplication, IsoDate, Session } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { applicationLabel, weekLabels } from '../../lib/blocks'
import { addDays, parseIsoDate, toIsoDate } from '../../lib/dates'
import { formatLongDate } from '../../lib/format'
import Modal from '../planner/Modal'

interface Props {
  /** Lunedì della settimana mostrata. */
  monday: IsoDate
  applications: BlockApplication[]
  sessions: Session[]
  /** Toglie l'applicazione e le sue sedute ancora programmate. */
  onRemove: (appId: string) => Promise<void> | void
}

/** Etichette dei blocchi e delle fasi applicati alla settimana (es. "Base · Carico · sett. 2/4"). */
export default function WeekLabels({
  monday,
  applications,
  sessions,
  onRemove,
}: Props) {
  const { t } = useI18n()
  const c = t.calendar
  const [open, setOpen] = useState<BlockApplication | null>(null)
  const [confirming, setConfirming] = useState(false)
  const labels = weekLabels(applications, monday)
  if (labels.length === 0 && !open) return null

  const date = (iso: IsoDate) => formatLongDate(iso, t.monthsShort)
  const text = (a: BlockApplication, w: BlockApplication['weeks'][number]) =>
    applicationLabel(a, w, c.weekShort)

  return (
    <>
      <div className="cal-labels">
        {labels.map(({ application: a, week: w }) => (
          <button
            key={a.id}
            type="button"
            className="cal-label"
            data-phase={a.kind === 'phase' ? '' : undefined}
            onClick={() => {
              setConfirming(false)
              setOpen(a)
            }}
          >
            <i />
            {text(a, w)}
          </button>
        ))}
      </div>

      {open && (
        <Modal
          title={open.name}
          closeLabel={c.close}
          onClose={() => setOpen(null)}
        >
          {(() => {
            const last = open.weeks[open.weeks.length - 1]
            const end = last
              ? toIsoDate(addDays(parseIsoDate(last.start), 6))
              : open.startDate
            const planned = sessions.filter(
              (s) => s.applicationId === open.id && s.status === 'planned',
            ).length
            const other = sessions.filter(
              (s) => s.applicationId === open.id && s.status !== 'planned',
            ).length
            return (
              <div className="pl-form">
                <dl className="sd-meta">
                  <div>
                    <dt>{c.appKind}</dt>
                    <dd>{open.kind === 'phase' ? c.appPhase : c.appBlock}</dd>
                  </div>
                  <div>
                    <dt>{c.appPeriod}</dt>
                    <dd>
                      {date(open.startDate)} – {date(end)}
                    </dd>
                  </div>
                  <div>
                    <dt>{c.appPlanned}</dt>
                    <dd>{planned}</dd>
                  </div>
                  <div>
                    <dt>{c.appOther}</dt>
                    <dd>{other}</dd>
                  </div>
                </dl>
                <div className="pl-danger">
                  {confirming ? (
                    <span className="pl-confirm">
                      <small>
                        {c.appRemoveConfirm.replace('{n}', String(planned))}
                      </small>
                      <button
                        type="button"
                        className="pl-btn warn"
                        onClick={async () => {
                          await onRemove(open.id)
                          setOpen(null)
                        }}
                      >
                        {c.confirmYes}
                      </button>
                      <button
                        type="button"
                        className="pl-btn"
                        onClick={() => setConfirming(false)}
                      >
                        {c.cancel}
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="pl-btn warn"
                      onClick={() => setConfirming(true)}
                    >
                      {c.appRemove}
                    </button>
                  )}
                </div>
              </div>
            )
          })()}
        </Modal>
      )}
    </>
  )
}
