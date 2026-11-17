import { useMemo, useState, type FormEvent } from 'react'
import { DisciplineIcon } from '../../components/ui/Icons'
import type { EnduranceDiscipline, EnduranceTemplate } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { formatClock, parseClock } from '../../lib/enduranceTemplate'
import { newId } from '../../lib/ids'
import DurationField from './DurationField'
import EndurancePlanEditor from './EndurancePlanEditor'
import Modal from './Modal'
import TemplateFooter from './TemplateFooter'
import { draftFromPlan, evalDraft, type PlanDraft } from './endurancePlanDraft'

interface Props {
  discipline: EnduranceDiscipline
  /** `null` = nuovo allenamento. */
  template: EnduranceTemplate | null
  onSave: (t: EnduranceTemplate) => void
  onDuplicate: () => void
  onArchive: (archived: boolean) => void
  onDelete: () => void
  onClose: () => void
  /**
   * Modifica il piano di una seduta del Calendario: nome facoltativo e
   * niente duplica/archivia/elimina (non è un template).
   */
  forSession?: boolean
}

export default function EnduranceDialog({
  discipline: d,
  template,
  onSave,
  onDuplicate,
  onArchive,
  onDelete,
  onClose,
  forSession = false,
}: Props) {
  const { t } = useI18n()
  const p = t.planner

  const [name, setName] = useState(template?.name ?? '')
  const [notes, setNotes] = useState(template?.notes ?? '')
  const [draft, setDraft] = useState<PlanDraft>(() =>
    draftFromPlan(d, template ?? undefined),
  )
  // durata: `null` = automatica, altrimenti il testo scritto a mano
  const [override, setOverride] = useState<string | null>(
    template?.estimatedDurationSec
      ? formatClock(template.estimatedDurationSec)
      : null,
  )
  const [submitted, setSubmitted] = useState(false)

  const ev = useMemo(() => evalDraft(d, draft), [d, draft])

  const nameError = name.trim() || forSession ? null : p.nameRequired
  const overrideError =
    override !== null && override.trim() !== '' && parseClock(override) === null
  const valid = !nameError && !overrideError && ev.valid

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (!valid) return
    const now = new Date().toISOString()
    const trimmed = notes.trim()
    const seconds = override !== null ? parseClock(override) : null
    onSave({
      id: template?.id ?? newId(),
      discipline: d,
      name: name.trim().replace(/\s+/g, ' '),
      ...(trimmed && { notes: trimmed }),
      ...(seconds ? { estimatedDurationSec: seconds } : {}),
      ...ev.content,
      archived: template?.archived ?? false,
      createdAt: template?.createdAt ?? now,
      updatedAt: now,
    } as EnduranceTemplate)
  }

  return (
    <Modal
      title={forSession ? p.editPlan : template ? p.editWorkout : p.newWorkout}
      closeLabel={p.close}
      onClose={onClose}
      wide
      backdropClose={false}
    >
      <form
        className="pl-form"
        onSubmit={submit}
        noValidate
        data-discipline={d}
      >
        <div className="en-disc">
          <span className="wk-ic">
            <DisciplineIcon discipline={d} />
          </span>
          <b>{t.discipline[d]}</b>
        </div>

        <label className="pl-fld">
          <span>{forSession ? p.name : `${p.name} *`}</span>
          <input
            className="pl-inp"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={submitted && !!nameError}
            autoComplete="off"
          />
          {submitted && nameError && <em className="pl-err">{nameError}</em>}
        </label>

        <EndurancePlanEditor
          discipline={d}
          draft={draft}
          ev={ev}
          onChange={setDraft}
          submitted={submitted}
        />

        <DurationField
          override={override}
          auto={ev.autoDuration}
          onChange={setOverride}
        />

        <label className="pl-fld">
          <span>{p.notes}</span>
          <textarea
            className="pl-inp"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <TemplateFooter
          template={forSession ? null : template}
          onDuplicate={onDuplicate}
          onArchive={onArchive}
          onDelete={onDelete}
          onClose={onClose}
        />
      </form>
    </Modal>
  )
}
