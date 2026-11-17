import { useRef, useState, type FormEvent } from 'react'
import type {
  Id,
  Phase,
  TrainingBlock,
  WorkoutTemplate,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import { moveItem } from '../../lib/brick'
import { phaseWeeks, weekTotals } from '../../lib/blocks'
import { formatDuration } from '../../lib/format'
import { newId } from '../../lib/ids'
import ActionMenu from './ActionMenu'
import Modal from './Modal'
import TemplateFooter from './TemplateFooter'
import { useSortable } from './useSortable'
import './blocks.css'

/** Una riga della fase: il blocco, con una chiave propria (lo stesso blocco può ripetersi). */
interface Row {
  key: string
  blockId: Id
}

interface Props {
  /** `null` = nuova fase. */
  phase: Phase | null
  blocks: TrainingBlock[]
  templates: WorkoutTemplate[]
  onSave: (p: Phase) => void
  onDuplicate: () => void
  onArchive: (archived: boolean) => void
  onDelete: () => void
  onClose: () => void
}

/** Editor della fase: blocchi in ordine (anche ripetuti), con nome e obiettivo. */
export default function PhaseDialog({
  phase,
  blocks,
  templates,
  onSave,
  onDuplicate,
  onArchive,
  onDelete,
  onClose,
}: Props) {
  const { t } = useI18n()
  const p = t.planner
  const f = t.phases
  const [name, setName] = useState(phase?.name ?? '')
  const [goal, setGoal] = useState(phase?.goal ?? '')
  const [rows, setRows] = useState<Row[]>(() =>
    (phase?.blockIds ?? []).map((blockId) => ({ key: newId(), blockId })),
  )
  const [picking, setPicking] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const listRef = useRef<HTMLOListElement>(null)

  const { drag, handleProps } = useSortable({
    listRef,
    onMove: (from, to) => setRows((rs) => moveItem(rs, from, to)),
  })

  const blockIds = rows.map((r) => r.blockId)
  const summaryWeeks = phaseWeeks({ blockIds } as Phase, blocks)
  const summaryTotal = summaryWeeks.reduce(
    (a, w) => a + weekTotals(w.block.weeks[w.index], templates).totalS,
    0,
  )
  const summary = {
    weeks: summaryWeeks.length,
    avg: summaryWeeks.length ? summaryTotal / summaryWeeks.length : 0,
  }

  const nameError = name.trim() ? null : p.nameRequired
  const build = (): Phase | null => {
    setSubmitted(true)
    if (nameError) return null
    const now = new Date().toISOString()
    const g = goal.trim()
    return {
      id: phase?.id ?? newId(),
      name: name.trim().replace(/\s+/g, ' '),
      ...(g && { goal: g }),
      blockIds,
      archived: phase?.archived ?? false,
      createdAt: phase?.createdAt ?? now,
      updatedAt: now,
    }
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const built = build()
    if (built) onSave(built)
  }

  const available = blocks
    .filter((x) => !x.archived)
    .sort((a, c) => a.name.localeCompare(c.name))

  return (
    <Modal
      title={phase ? f.editPhase : f.newPhase}
      closeLabel={p.close}
      onClose={onClose}
      wide
      backdropClose={false}
    >
      <form className="pl-form" onSubmit={submit} noValidate>
        <label className="pl-fld">
          <span>{p.name} *</span>
          <input
            className="pl-inp"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={submitted && !!nameError}
            autoComplete="off"
          />
          {submitted && nameError && <em className="pl-err">{nameError}</em>}
        </label>

        <label className="pl-fld">
          <span>{f.goal}</span>
          <input
            className="pl-inp"
            value={goal}
            placeholder={f.goalPlaceholder}
            onChange={(e) => setGoal(e.target.value)}
          />
        </label>

        <div className="bl-weekbar">
          <b>{f.blocksTitle}</b>
          <span className="bl-tot">
            <span>
              {summary.weeks} {t.blocks.weeksCount}
            </span>
            {summary.avg > 0 && (
              <span>
                {formatDuration(summary.avg)} {t.blocks.perWeek}
              </span>
            )}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="ph">{f.noBlocks}</div>
        ) : (
          <ol className="ph-rows" ref={listRef}>
            {drag && <div className="pl-dropline" style={{ top: drag.line }} />}
            {rows.map((r, i) => {
              const blk = blocks.find((x) => x.id === r.blockId)
              return (
                <li
                  key={r.key}
                  data-block={i}
                  className={`ph-row${drag?.from === i ? ' lifting' : ''}${blk ? '' : ' missing'}`}
                >
                  <button
                    type="button"
                    className="tp-handle"
                    aria-label={f.dragHandle}
                    title={f.dragHandle}
                    {...handleProps(i)}
                  >
                    ⠿
                  </button>
                  <span className="ph-row-tx">
                    <b>{blk?.name ?? f.missingBlock}</b>
                    {blk && (
                      <small>
                        {blk.weeks.length} {t.blocks.weeksCount}
                      </small>
                    )}
                  </span>
                  <ActionMenu
                    label={f.rowMenu}
                    actions={[
                      {
                        label: p.moveUp,
                        disabled: i === 0,
                        onSelect: () => setRows((rs) => moveItem(rs, i, i - 1)),
                      },
                      {
                        label: p.moveDown,
                        disabled: i === rows.length - 1,
                        onSelect: () => setRows((rs) => moveItem(rs, i, i + 1)),
                      },
                      {
                        label: f.repeatBlock,
                        onSelect: () =>
                          setRows((rs) => [
                            ...rs.slice(0, i + 1),
                            { key: newId(), blockId: r.blockId },
                            ...rs.slice(i + 1),
                          ]),
                      },
                      {
                        label: f.removeBlock,
                        danger: true,
                        onSelect: () =>
                          setRows((rs) => rs.filter((x) => x.key !== r.key)),
                      },
                    ]}
                  />
                </li>
              )
            })}
          </ol>
        )}

        <button
          type="button"
          className="pl-btn acc pl-small ph-addblock"
          onClick={() => setPicking(true)}
        >
          + {f.addBlock}
        </button>

        <TemplateFooter
          template={phase}
          onDuplicate={onDuplicate}
          onArchive={onArchive}
          onDelete={onDelete}
          onClose={onClose}
          confirmDeleteText={f.confirmDelete}
        />
      </form>

      {picking && (
        <Modal
          title={f.chooseBlock}
          closeLabel={p.close}
          onClose={() => setPicking(false)}
        >
          {available.length === 0 ? (
            <div className="ph">{f.noBlocksYet}</div>
          ) : (
            <ul className="pl-list">
              {available.map((x) => (
                <li key={x.id} className="pl-item">
                  <button
                    type="button"
                    className="pl-item-main"
                    onClick={() => {
                      setRows((rs) => [...rs, { key: newId(), blockId: x.id }])
                      setPicking(false)
                    }}
                  >
                    <b className="pl-item-name">{x.name}</b>
                    <span className="wk-meta">
                      {x.weeks.length} {t.blocks.weeksCount}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </Modal>
  )
}
