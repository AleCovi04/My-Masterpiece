import { useState } from 'react'
import { DisciplineIcon } from '../../components/ui/Icons'
import type {
  Exercise,
  IsoDate,
  Session,
  SessionStatus,
  WorkoutTemplate,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import { isIsoDate } from '../../lib/dates'
import { formatDuration } from '../../lib/format'
import { sessionAsTemplate, sessionDurationSec } from '../../lib/sessions'
import EnduranceDialog from '../planner/EnduranceDialog'
import Modal from '../planner/Modal'
import TemplateDialog from '../planner/TemplateDialog'
import SessionPlanView from './SessionPlanView'
import { fullDateLabel } from './period'
import '../planner/planner.css'

interface Props {
  session: Session
  templates: WorkoutTemplate[]
  exercises: Exercise[]
  onEditPlan: (edited: WorkoutTemplate) => void
  onMoveDate: (date: IsoDate) => void
  onDuplicate: () => void
  onStatus: (status: SessionStatus) => void
  onDelete: () => void
  onClose: () => void
}

const noop = () => {}

/** Dettaglio di una seduta: finestra su PC, schermata intera su telefono. */
export default function SessionDetail({
  session: s,
  templates,
  exercises,
  onEditPlan,
  onMoveDate,
  onDuplicate,
  onStatus,
  onDelete,
  onClose,
}: Props) {
  const { t } = useI18n()
  const c = t.calendar
  const [editing, setEditing] = useState(false)
  // `null` = riga "Sposta data" chiusa
  const [newDate, setNewDate] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const name = s.name ?? t.discipline[s.discipline]
  const seconds = sessionDurationSec(s)
  const origin = s.templateId
    ? (templates.find((w) => w.id === s.templateId)?.name ??
      `${s.name ?? '—'} (${c.originDeleted})`)
    : c.originNone
  // si salta solo ciò che è ancora da fare; "Ripristina" lo riporta a programmato
  const canToggleSkip = s.status === 'planned' || s.status === 'skipped'
  const dateOk = isIsoDate(newDate) && newDate !== s.date

  const closeEditor = () => setEditing(false)
  const save = (edited: WorkoutTemplate) => {
    onEditPlan(edited)
    closeEditor()
  }
  const editorProps = {
    forSession: true,
    onSave: save,
    onDuplicate: noop,
    onArchive: noop,
    onDelete: noop,
    onClose: closeEditor,
  }

  return (
    <>
      <Modal title={name} closeLabel={c.close} onClose={onClose}>
        <div className="sd" data-discipline={s.discipline}>
          <div className="sd-head">
            <span className="wk-ic">
              <DisciplineIcon discipline={s.discipline} />
            </span>
            <b>{t.discipline[s.discipline]}</b>
            <span className={`tag ${s.status}`}>{t.status[s.status]}</span>
          </div>

          <dl className="sd-meta">
            <div>
              <dt>{c.date}</dt>
              <dd>{fullDateLabel(s.date, t)}</dd>
            </div>
            <div>
              <dt>{c.origin}</dt>
              <dd>{origin}</dd>
            </div>
            <div>
              <dt>{c.duration}</dt>
              <dd>{seconds ? formatDuration(seconds) : c.durationUnknown}</dd>
            </div>
            {s.notes && (
              <div className="sd-wide">
                <dt>{c.notes}</dt>
                <dd>{s.notes}</dd>
              </div>
            )}
          </dl>

          <button type="button" className="pl-btn acc sd-start" disabled>
            {c.start}
            <small>{c.comingSoon}</small>
          </button>

          <section className="sd-sec">
            <h4>{c.plan}</h4>
            <SessionPlanView session={s} exercises={exercises} />
          </section>

          <div className="pl-actions">
            <button
              type="button"
              className="pl-btn"
              onClick={() => setEditing(true)}
            >
              {c.editPlan}
            </button>
            <button
              type="button"
              className="pl-btn"
              aria-expanded={newDate !== null}
              onClick={() => setNewDate(newDate === null ? s.date : null)}
            >
              {c.moveDate}
            </button>
            <button type="button" className="pl-btn" onClick={onDuplicate}>
              {c.duplicate}
            </button>
            <button
              type="button"
              className="pl-btn"
              disabled={!canToggleSkip}
              onClick={() =>
                onStatus(s.status === 'skipped' ? 'planned' : 'skipped')
              }
            >
              {s.status === 'skipped' ? c.restore : c.skip}
            </button>
          </div>

          {newDate !== null && (
            <div className="sd-move">
              <label className="pl-fld">
                <span>{c.newDate}</span>
                <input
                  type="date"
                  className="pl-inp"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="pl-btn acc"
                disabled={!dateOk}
                onClick={() => {
                  if (!dateOk) return
                  onMoveDate(newDate)
                  setNewDate(null)
                }}
              >
                {c.move}
              </button>
              <button
                type="button"
                className="pl-btn"
                onClick={() => setNewDate(null)}
              >
                {c.cancel}
              </button>
            </div>
          )}

          <div className="pl-danger">
            {confirmingDelete ? (
              <span className="pl-confirm">
                <small>{c.confirmDelete}</small>
                <button
                  type="button"
                  className="pl-btn warn"
                  onClick={onDelete}
                >
                  {c.confirmYes}
                </button>
                <button
                  type="button"
                  className="pl-btn"
                  onClick={() => setConfirmingDelete(false)}
                >
                  {c.cancel}
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="pl-btn warn"
                onClick={() => setConfirmingDelete(true)}
              >
                {c.delete}
              </button>
            )}
          </div>
        </div>
      </Modal>

      {editing &&
        (s.discipline === 'strength' ? (
          <TemplateDialog
            template={sessionAsTemplate(s)}
            exercises={exercises}
            {...editorProps}
          />
        ) : (
          <EnduranceDialog
            discipline={s.discipline}
            template={sessionAsTemplate(s)}
            {...editorProps}
          />
        ))}
    </>
  )
}
