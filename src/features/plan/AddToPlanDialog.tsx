import { useState } from 'react'
import type { Phase, TrainingBlock } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { phaseWeeks } from '../../lib/blocks'
import { Seg } from '../planner/EndurancePlanEditor'
import Modal from '../planner/Modal'

interface Props {
  phases: Phase[]
  blocks: TrainingBlock[]
  onPick: (
    pick:
      { kind: 'phase'; phase: Phase } | { kind: 'block'; block: TrainingBlock },
  ) => void
  onClose: () => void
}

/** "+ Aggiungi al piano": si sceglie una fase o un blocco creati nel Forger. */
export default function AddToPlanDialog({
  phases,
  blocks,
  onPick,
  onClose,
}: Props) {
  const { t, lang } = useI18n()
  const pl = t.plan
  const [kind, setKind] = useState<'phase' | 'block'>(
    phases.some((p) => !p.archived) ? 'phase' : 'block',
  )
  const byName = <T extends { name: string; archived: boolean }>(list: T[]) =>
    list
      .filter((x) => !x.archived)
      .sort((a, b) => a.name.localeCompare(b.name, lang))
  const list = kind === 'phase' ? byName(phases) : byName(blocks)

  return (
    <Modal title={pl.addTitle} closeLabel={pl.close} onClose={onClose}>
      <div className="pl-form">
        <Seg
          label={pl.addTitle}
          value={kind}
          onChange={setKind}
          options={[
            ['phase', pl.phases],
            ['block', pl.blocks],
          ]}
        />
        {list.length === 0 ? (
          <div className="ph">
            {kind === 'phase' ? pl.noPhases : pl.noBlocks}
          </div>
        ) : (
          <ul className="pl-list">
            {kind === 'phase'
              ? byName(phases).map((p) => (
                  <li
                    key={p.id}
                    className="pl-item ph-item"
                    data-phase={p.color}
                  >
                    <button
                      type="button"
                      className="pl-item-main"
                      onClick={() => onPick({ kind: 'phase', phase: p })}
                    >
                      <b className="pl-item-name">{p.name}</b>
                      <span className="wk-meta">
                        {p.blockIds.length} {t.phases.blocksCount} ·{' '}
                        {phaseWeeks(p, blocks).length} {t.blocks.weeksCount}
                      </span>
                      {p.goal && <span className="wk-sum">{p.goal}</span>}
                    </button>
                  </li>
                ))
              : byName(blocks).map((b) => (
                  <li key={b.id} className="pl-item">
                    <button
                      type="button"
                      className="pl-item-main"
                      onClick={() => onPick({ kind: 'block', block: b })}
                    >
                      <b className="pl-item-name">{b.name}</b>
                      <span className="wk-meta">
                        {b.weeks.length} {t.blocks.weeksCount}
                      </span>
                    </button>
                  </li>
                ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
