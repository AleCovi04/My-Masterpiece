import { useMemo, useRef, useState, type FormEvent } from 'react'
import { DisciplineIcon } from '../../components/ui/Icons'
import {
  BLOCK_MAX_WEEKS,
  type BlockItem,
  type BlockWeek,
  type Exercise,
  type Sport,
  type TrainingBlock,
  type WorkoutTemplate,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  addItems,
  copyWeekOnto,
  duplicateWeek,
  moveItem,
  newWeek,
  removeItem,
  removeWeek,
  weekTotals,
} from '../../lib/blocks'
import { templateDurationSec } from '../../lib/enduranceTemplate'
import { formatDuration } from '../../lib/format'
import { newId } from '../../lib/ids'
import { DISCIPLINES } from '../../lib/weekStats'
import TemplatePickerDialog from '../calendar/TemplatePickerDialog'
import { weekdayShortNames } from '../../lib/period'
import ActionMenu, { type MenuAction } from './ActionMenu'
import Modal from '../../components/ui/Modal'
import TemplateFooter from './TemplateFooter'
import { useDragSort } from '../../hooks/useSortable'
import './blocks.css'

interface DropTarget {
  day: number
  index: number
  line: { top: number; left: number; width: number }
}

interface Props {
  /** `null` = nuovo blocco. */
  block: TrainingBlock | null
  templates: WorkoutTemplate[]
  exercises: Exercise[]
  onSave: (b: TrainingBlock) => void
  onDuplicate: () => void
  onArchive: (archived: boolean) => void
  onDelete: () => void
  /** Fasi che usano questo blocco (per la conferma di eliminazione). */
  usedInPhases: number
  onClose: () => void
}

/** Editor del blocco: settimane tipo, una alla volta, con 7 giorni. */
export default function BlockDialog({
  block,
  templates,
  exercises,
  onSave,
  onDuplicate,
  onArchive,
  onDelete,
  usedInPhases,
  onClose,
}: Props) {
  const { t } = useI18n()
  const p = t.planner
  const b = t.blocks
  const days = weekdayShortNames(t)

  const [name, setName] = useState(block?.name ?? '')
  const [notes, setNotes] = useState(block?.notes ?? '')
  const [weeks, setWeeks] = useState<BlockWeek[]>(
    () => block?.weeks ?? [newWeek()],
  )
  const [cur, setCur] = useState(0)
  const [picking, setPicking] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  const week = weeks[Math.min(cur, weeks.length - 1)]
  const totals = useMemo(
    () => weeks.map((w) => weekTotals(w, templates)),
    [weeks, templates],
  )
  const tot = totals[Math.min(cur, weeks.length - 1)]
  const nameError = name.trim() ? null : p.nameRequired

  const setWeek = (fn: (w: BlockWeek) => BlockWeek) =>
    setWeeks((ws) => ws.map((w) => (w.id === week.id ? fn(w) : w)))

  // ---------- trascinamento tra i giorni ----------

  const locate = (id: string, x: number, y: number): DropTarget | null => {
    const grid = gridRef.current
    if (!grid) return null
    const box = grid.getBoundingClientRect()
    const lists = Array.from(
      grid.querySelectorAll<HTMLElement>('[data-day-list]'),
    )
    // il giorno sotto il puntatore, altrimenti il più vicino
    let best = lists[0]
    let bestDist = Infinity
    for (const l of lists) {
      const r = l.getBoundingClientRect()
      const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0
      const dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0
      const dist = dx * dx + dy * dy
      if (dist < bestDist) {
        bestDist = dist
        best = l
      }
    }
    if (!best) return null
    const items = Array.from(
      best.querySelectorAll<HTMLElement>(':scope > [data-item]'),
    ).filter((n) => n.dataset.item !== id)
    let index = items.length
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect()
      if (y < r.top + r.height / 2) {
        index = i
        break
      }
    }
    const lr = best.getBoundingClientRect()
    const top =
      items.length === 0
        ? lr.top + 4
        : index === 0
          ? items[0].getBoundingClientRect().top - 4
          : items[index - 1].getBoundingClientRect().bottom + 4
    return {
      day: Number(best.dataset.dayList),
      index,
      line: { top: top - box.top, left: lr.left - box.left, width: lr.width },
    }
  }

  const { drag, handleProps } = useDragSort<string, DropTarget>({
    listRef: gridRef,
    locate,
    onDrop: (id, target) =>
      setWeek((w) => moveItem(w, id, target.day, target.index)),
  })

  // ---------- azioni ----------

  const weekActions: MenuAction[] = [
    {
      label: b.duplicateWeek,
      disabled: weeks.length >= BLOCK_MAX_WEEKS,
      onSelect: () => {
        setWeeks((ws) => duplicateWeek(ws, cur))
        setCur(cur + 1)
      },
    },
    ...weeks.flatMap((_, k) =>
      k === cur
        ? []
        : [
            {
              label: `${b.copyOnto} ${k + 1}`,
              onSelect: () => setWeeks((ws) => copyWeekOnto(ws, cur, k)),
            },
          ],
    ),
    {
      label: b.removeWeek,
      danger: true,
      disabled: weeks.length <= 1,
      onSelect: () => {
        setWeeks((ws) => removeWeek(ws, cur))
        setCur(Math.max(0, cur - 1))
      },
    },
  ]

  const itemInfo = (it: BlockItem) => {
    if (it.kind === 'empty') {
      return {
        discipline: it.discipline,
        name: `${t.discipline[it.discipline]} · ${b.emptyItem}`,
        secs: null as number | null,
        missing: false,
      }
    }
    const tpl = templates.find((x) => x.id === it.templateId)
    return tpl
      ? {
          discipline: tpl.discipline,
          name: tpl.name,
          secs: templateDurationSec(tpl),
          missing: false,
        }
      : { discipline: null, name: b.missingTemplate, secs: null, missing: true }
  }

  const build = (): TrainingBlock | null => {
    setSubmitted(true)
    if (nameError) return null
    const now = new Date().toISOString()
    const trimmed = notes.trim()
    return {
      id: block?.id ?? newId(),
      name: name.trim().replace(/\s+/g, ' '),
      ...(trimmed && { notes: trimmed }),
      weeks,
      archived: block?.archived ?? false,
      createdAt: block?.createdAt ?? now,
      updatedAt: now,
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const built = build()
    if (built) onSave(built)
  }

  const sportHours = (bySport: Record<Sport, number>) =>
    DISCIPLINES.filter((d) => bySport[d] > 0)

  return (
    <Modal
      title={block ? b.editBlock : b.newBlock}
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

        <div className="pl-fld">
          <span>{b.weeks}</span>
          <div className="bl-weeks" role="tablist" aria-label={b.weeks}>
            {weeks.map((w, k) => (
              <button
                key={w.id}
                type="button"
                role="tab"
                aria-selected={k === cur}
                onClick={() => setCur(k)}
              >
                <b>
                  {b.weekShort}
                  {k + 1}
                </b>
                <small>
                  {totals[k].totalS > 0
                    ? formatDuration(totals[k].totalS)
                    : '—'}
                </small>
              </button>
            ))}
            <button
              type="button"
              className="bl-addweek"
              disabled={weeks.length >= BLOCK_MAX_WEEKS}
              onClick={() => {
                setWeeks((ws) => [...ws, newWeek()])
                setCur(weeks.length)
              }}
            >
              + {b.addWeek}
            </button>
          </div>
        </div>

        <div className="bl-weekbar">
          <b>
            {b.week} {cur + 1}
          </b>
          <span className="bl-tot">
            {sportHours(tot.bySport).map((d) => (
              <span key={d} className="bl-sport" data-discipline={d}>
                <i />
                {t.discipline[d]} {formatDuration(tot.bySport[d])}
              </span>
            ))}
            <span>
              {tot.count} {b.workouts}
            </span>
            {tot.unknown > 0 && (
              <span>
                {tot.unknown} {b.noDuration}
              </span>
            )}
          </span>
          <ActionMenu label={b.weekMenu} actions={weekActions} />
        </div>

        <div className={`bl-grid${drag ? ' dragging' : ''}`} ref={gridRef}>
          {drag && (
            <div
              className="pl-dropline"
              style={{
                top: drag.target.line.top,
                left: drag.target.line.left,
                right: 'auto',
                width: drag.target.line.width,
              }}
            />
          )}
          {week.days.map((items, d) => (
            <section className="bl-day" key={d}>
              <h4>{days[d]}</h4>
              <div className="bl-items" data-day-list={d}>
                {items.map((it) => {
                  const info = itemInfo(it)
                  return (
                    <div
                      key={it.id}
                      data-item={it.id}
                      className={`bl-item${drag?.key === it.id ? ' lifting' : ''}${info.missing ? ' missing' : ''}`}
                      data-discipline={info.discipline ?? undefined}
                    >
                      <button
                        type="button"
                        className="bl-handle"
                        aria-label={b.dragHandle}
                        title={b.dragHandle}
                        {...handleProps(it.id)}
                      >
                        {info.discipline ? (
                          <DisciplineIcon discipline={info.discipline} />
                        ) : (
                          '!'
                        )}
                      </button>
                      <span className="bl-item-tx">
                        <b>{info.name}</b>
                        {info.secs ? (
                          <small>{formatDuration(info.secs)}</small>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        className="bl-x"
                        aria-label={`${b.removeItem}: ${info.name}`}
                        title={b.removeItem}
                        onClick={() => setWeek((w) => removeItem(w, it.id))}
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
              <button
                type="button"
                className="bl-add"
                aria-label={`${b.addItem}: ${days[d]}`}
                onClick={() => setPicking(d)}
              >
                +
              </button>
            </section>
          ))}
        </div>

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
          template={block}
          onDuplicate={onDuplicate}
          onArchive={onArchive}
          onDelete={onDelete}
          onClose={onClose}
          confirmDeleteText={
            usedInPhases > 0
              ? `${b.confirmDelete} ${b.usedInPhases.replace('{n}', String(usedInPhases))}`
              : b.confirmDelete
          }
        />
      </form>

      {picking !== null && (
        <TemplatePickerDialog
          subtitle={`${b.week} ${cur + 1} · ${days[picking]}`}
          templates={templates}
          exercises={exercises}
          onPickTemplate={(tpl) => {
            setWeek((w) =>
              addItems(w, picking, [
                { id: newId(), kind: 'template', templateId: tpl.id },
              ]),
            )
            setPicking(null)
          }}
          onPickEmpty={(discipline) => {
            setWeek((w) =>
              addItems(w, picking, [
                { id: newId(), kind: 'empty', discipline },
              ]),
            )
            setPicking(null)
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </Modal>
  )
}
