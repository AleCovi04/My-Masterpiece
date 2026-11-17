import { useState } from 'react'
import { useI18n } from '../../i18n/context'

interface Props {
  /** `null` = nuovo allenamento: niente duplica/archivia/elimina. */
  template: { archived: boolean } | null
  onDuplicate: () => void
  onArchive: (archived: boolean) => void
  onDelete: () => void
  onClose: () => void
  /** Falso per ciò che si archivia soltanto (blocchi, fasi). */
  canDelete?: boolean
}

/** Pulsanti comuni a tutti gli editor di template: Salva/Annulla e Duplica/Archivia/Elimina. */
export default function TemplateFooter({
  template,
  onDuplicate,
  onArchive,
  onDelete,
  onClose,
  canDelete = true,
}: Props) {
  const { t } = useI18n()
  const p = t.planner
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <>
      <div className="pl-actions">
        <button type="submit" className="pl-btn acc">
          {p.save}
        </button>
        <button type="button" className="pl-btn" onClick={onClose}>
          {p.cancel}
        </button>
      </div>

      {template && (
        <div className="pl-danger">
          <button type="button" className="pl-btn" onClick={onDuplicate}>
            {p.duplicate}
          </button>
          <button
            type="button"
            className="pl-btn"
            onClick={() => onArchive(!template.archived)}
          >
            {template.archived ? p.restore : p.archive}
          </button>
          {!canDelete ? null : confirmingDelete ? (
            <span className="pl-confirm">
              <small>{p.confirmDeleteWorkout}</small>
              <button type="button" className="pl-btn warn" onClick={onDelete}>
                {p.confirmYes}
              </button>
              <button
                type="button"
                className="pl-btn"
                onClick={() => setConfirmingDelete(false)}
              >
                {p.cancel}
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="pl-btn warn"
              onClick={() => setConfirmingDelete(true)}
            >
              {p.deleteWorkout}
            </button>
          )}
        </div>
      )}
    </>
  )
}
