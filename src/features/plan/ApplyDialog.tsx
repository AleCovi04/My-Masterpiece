import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session, WorkoutTemplate } from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  isMonday,
  planApplication,
  type ApplyInput,
  type ApplyResult,
  type SourceWeek,
} from '../../lib/blocks'
import {
  addDays,
  isIsoDate,
  mondayOf,
  parseIsoDate,
  toIsoDate,
} from '../../lib/dates'
import { formatLongDate } from '../../lib/format'
import { Seg } from '../planner/EndurancePlanEditor'
import Modal from '../planner/Modal'
import '../planner/blocks.css'

interface Props {
  kind: 'block' | 'phase'
  sourceId: string
  name: string
  weeks: SourceWeek[]
  templates: WorkoutTemplate[]
  /** Sedute attuali, per l'anteprima. */
  sessions: Session[]
  onApply: (input: ApplyInput) => Promise<ApplyResult | null>
  onClose: () => void
}

/** Lunedì prossimo (oggi se è lunedì). */
function nextMonday(): string {
  const today = new Date()
  const monday = mondayOf(today)
  return toIsoDate(
    toIsoDate(monday) === toIsoDate(today) ? monday : addDays(monday, 7),
  )
}

/** "Applica al calendario": da un lunedì, in coda o sostituendo le programmate. */
export default function ApplyDialog({
  kind,
  sourceId,
  name,
  weeks,
  templates,
  sessions,
  onApply,
  onClose,
}: Props) {
  const { t } = useI18n()
  const b = t.blocks
  const navigate = useNavigate()
  const [start, setStart] = useState(nextMonday)
  const [mode, setMode] = useState<'append' | 'replace'>('append')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<ApplyResult | null>(null)

  const dateOk = isIsoDate(start) && isMonday(start)
  const input: ApplyInput = {
    kind,
    sourceId,
    name,
    weeks,
    start,
    mode,
  }
  const preview = useMemo(
    () =>
      dateOk && weeks.length > 0
        ? planApplication(input, sessions, templates)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateOk, start, mode, weeks, sessions, templates],
  )
  const end =
    dateOk && weeks.length > 0
      ? toIsoDate(addDays(parseIsoDate(start), weeks.length * 7 - 1))
      : null
  const date = (iso: string) => formatLongDate(iso, t.monthsShort)

  if (done) {
    return (
      <Modal title={b.appliedTitle} closeLabel={b.close} onClose={onClose}>
        <p>
          {b.appliedText
            .replace('{n}', String(done.created))
            .replace('{date}', date(done.application.startDate))}
        </p>
        {done.missing > 0 && (
          <p className="lv-muted">
            {b.missingSkipped.replace('{n}', String(done.missing))}
          </p>
        )}
        <div className="pl-actions">
          <button
            type="button"
            className="pl-btn acc"
            onClick={() => navigate('/calendario')}
          >
            {b.toCalendar}
          </button>
          <button type="button" className="pl-btn" onClick={onClose}>
            {b.close}
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={b.applyTitle} closeLabel={b.close} onClose={onClose}>
      <div className="pl-form">
        <p className="sp-sub">
          {name} · {weeks.length} {b.weeksCount}
        </p>

        <label className="pl-fld">
          <span>{b.startMonday}</span>
          <input
            type="date"
            className="pl-inp"
            value={start}
            aria-invalid={!dateOk}
            onChange={(e) => setStart(e.target.value)}
          />
          {!dateOk && <em className="pl-err">{b.mustBeMonday}</em>}
        </label>

        <div className="pl-fld">
          <span>{b.modeLabel}</span>
          <Seg
            label={b.modeLabel}
            value={mode}
            onChange={setMode}
            options={[
              ['append', b.modeAppend],
              ['replace', b.modeReplace],
            ]}
          />
          <small>
            {mode === 'append' ? b.modeAppendHint : b.modeReplaceHint}
          </small>
        </div>

        {weeks.length === 0 ? (
          <div className="ph">{b.nothingToApply}</div>
        ) : (
          preview &&
          end && (
            <ul className="bl-preview">
              <li>
                {b.previewRange
                  .replace('{from}', date(start))
                  .replace('{to}', date(end))}
              </li>
              <li>
                <b>{preview.created}</b> {b.previewCreated}
              </li>
              {preview.replaced > 0 && (
                <li className="bl-warn">
                  <b>{preview.replaced}</b> {b.previewReplaced}
                </li>
              )}
              {preview.missing > 0 && (
                <li className="bl-warn">
                  {b.missingSkipped.replace('{n}', String(preview.missing))}
                </li>
              )}
            </ul>
          )
        )}

        <div className="pl-actions">
          <button
            type="button"
            className={`pl-btn ${mode === 'replace' && (preview?.replaced ?? 0) > 0 ? 'warn' : 'acc'}`}
            disabled={!dateOk || weeks.length === 0 || busy}
            onClick={async () => {
              setBusy(true)
              try {
                const r = await onApply(input)
                if (r) setDone(r)
              } finally {
                setBusy(false)
              }
            }}
          >
            {b.apply}
          </button>
          <button type="button" className="pl-btn" onClick={onClose}>
            {b.cancel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
