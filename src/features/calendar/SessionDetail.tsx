import { useState } from 'react'
import { DisciplineIcon, LegIcons } from '../../components/ui/Icons'
import RpeScale from '../../components/ui/RpeScale'
import { brickSports } from '../../lib/brick'
import type {
  BrickActual,
  EnduranceActual,
  Exercise,
  IsoDate,
  Session,
  SessionStatus,
  WorkoutTemplate,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import { isIsoDate } from '../../lib/dates'
import { formatDuration } from '../../lib/format'
import { sessionRpe } from '../../lib/load'
import { sessionAsTemplate, sessionDurationSec } from '../../lib/sessions'
import ActualDialog from '../endurance/ActualDialog'
import ActualView from '../endurance/ActualView'
import BrickDialog from '../planner/BrickDialog'
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
  /** Avvia la registrazione dal vivo (solo forza programmata). */
  onStart: () => void
  /** Apre l'allenamento in corso (questo o un altro). */
  onResume: () => void
  /** Un'altra seduta di forza è già in corso. */
  liveElsewhere: boolean
  /** Salva l'eseguito endurance inserito a mano (la seduta diventa completata). */
  onSaveActual: (actual: EnduranceActual | BrickActual) => void
  /** Elimina l'eseguito endurance (la seduta torna programmata). */
  onClearActual: () => void
  /** Aggiunge l'RPE mancante di una seduta svolta. */
  onSetRpe: (rpe: number) => void
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
  onStart,
  onResume,
  liveElsewhere,
  onSaveActual,
  onClearActual,
  onSetRpe,
}: Props) {
  const { t } = useI18n()
  const c = t.calendar
  const e = t.endurance
  const [editing, setEditing] = useState(false)
  const [recording, setRecording] = useState(false)
  const [confirmingClear, setConfirmingClear] = useState(false)
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
            {s.discipline === 'brick' && (
              <LegIcons sports={brickSports(s.plan.legs)} />
            )}
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

          {s.status === 'done' && s.actual && sessionRpe(s) === undefined && (
            <section className="sd-sec">
              <h4>{t.rpe.add}</h4>
              <small className="sd-hint">{t.rpe.addHow}</small>
              <RpeScale value={null} onChange={onSetRpe} bare />
            </section>
          )}

          {s.discipline !== 'strength' ? (
            s.actual ? (
              <section className="sd-sec">
                <h4>{e.section}</h4>
                <ActualView session={s} />
                <div className="pl-actions">
                  <button
                    type="button"
                    className="pl-btn"
                    onClick={() => setRecording(true)}
                  >
                    {e.edit}
                  </button>
                  {confirmingClear ? (
                    <span className="pl-confirm">
                      <small>{e.confirmRemove}</small>
                      <button
                        type="button"
                        className="pl-btn warn"
                        onClick={() => {
                          onClearActual()
                          setConfirmingClear(false)
                        }}
                      >
                        {e.confirmYes}
                      </button>
                      <button
                        type="button"
                        className="pl-btn"
                        onClick={() => setConfirmingClear(false)}
                      >
                        {e.cancel}
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="pl-btn warn"
                      onClick={() => setConfirmingClear(true)}
                    >
                      {e.remove}
                    </button>
                  )}
                </div>
              </section>
            ) : (
              <button
                type="button"
                className="pl-btn acc sd-start"
                disabled={s.status === 'skipped'}
                onClick={() => setRecording(true)}
              >
                {e.record}
              </button>
            )
          ) : s.status === 'in_progress' ? (
            <button
              type="button"
              className="pl-btn acc sd-start"
              onClick={onResume}
            >
              {c.resume}
            </button>
          ) : s.status === 'done' ? null : liveElsewhere ? (
            <div className="sd-live-other">
              <small>{c.otherLive}</small>
              <button type="button" className="pl-btn" onClick={onResume}>
                {c.goToLive}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="pl-btn acc sd-start"
              disabled={s.status === 'skipped'}
              onClick={onStart}
            >
              {c.start}
            </button>
          )}

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

      {recording && s.discipline !== 'strength' && (
        <ActualDialog
          session={s}
          onSave={(actual) => {
            onSaveActual(actual)
            setRecording(false)
          }}
          onClose={() => setRecording(false)}
        />
      )}

      {editing &&
        (s.discipline === 'strength' ? (
          <TemplateDialog
            template={sessionAsTemplate(s)}
            exercises={exercises}
            {...editorProps}
          />
        ) : s.discipline === 'brick' ? (
          <BrickDialog template={sessionAsTemplate(s)} {...editorProps} />
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
