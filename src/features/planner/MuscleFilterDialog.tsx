import { useState } from 'react'
import { BodyMap } from '../../components/body'
import type { MuscleId } from '../../data/types'
import { useI18n } from '../../i18n/context'
import Modal from './Modal'

interface Props {
  selected: MuscleId[]
  onApply: (next: MuscleId[]) => void
  onClose: () => void
}

/** Scelta dei muscoli sulla BodyMap; la selezione vale solo dopo "Applica". */
export default function MuscleFilterDialog({
  selected,
  onApply,
  onClose,
}: Props) {
  const { t } = useI18n()
  const p = t.planner
  const [draft, setDraft] = useState<MuscleId[]>(selected)

  return (
    <Modal title={p.chooseMuscle} closeLabel={p.close} onClose={onClose} wide>
      <BodyMap mode="select" multiple selected={draft} onChange={setDraft} />
      <div className="pl-actions">
        <button
          type="button"
          className="pl-btn"
          disabled={draft.length === 0}
          onClick={() => setDraft([])}
        >
          {p.reset}
        </button>
        <button
          type="button"
          className="pl-btn acc"
          onClick={() => onApply(draft)}
        >
          {p.apply}
        </button>
      </div>
    </Modal>
  )
}
