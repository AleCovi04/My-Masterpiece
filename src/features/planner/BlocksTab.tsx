import { useMemo, useState } from 'react'
import { ArchiveIcon, RestoreIcon } from '../../components/ui/Icons'
import type { TrainingBlock } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { blockWeeks, phasesUsing, weekTotals } from '../../lib/blocks'
import { normalizeName } from '../../lib/exercises'
import { formatDuration } from '../../lib/format'
import ApplyDialog from './ApplyDialog'
import BlockDialog from './BlockDialog'
import type { usePlanning } from './usePlanning'

type Planning = ReturnType<typeof usePlanning>

/** Planner → Blocchi: settimane tipo da applicare al calendario. */
export default function BlocksTab({ planning }: { planning: Planning }) {
  const { t, lang } = useI18n()
  const p = t.planner
  const b = t.blocks
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  // `undefined` = chiuso, `'new'` = nuovo, altrimenti id
  const [editing, setEditing] = useState<string | undefined>()
  const [applying, setApplying] = useState<TrainingBlock | null>(null)
  const { blocks, templates } = planning

  const visible = useMemo(() => {
    const q = normalizeName(query)
    return blocks
      .filter(
        (x) =>
          (showArchived || !x.archived) &&
          (!q || normalizeName(x.name).includes(q)),
      )
      .sort((a, c) => a.name.localeCompare(c.name, lang))
  }, [blocks, query, showArchived, lang])

  if (planning.loading) return null
  const current =
    editing && editing !== 'new'
      ? (blocks.find((x) => x.id === editing) ?? null)
      : null
  const close = () => setEditing(undefined)

  return (
    <>
      <div className="pl-toolbar">
        <input
          type="search"
          className="pl-inp pl-search"
          placeholder={p.search}
          aria-label={p.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="pl-check">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          {p.showArchived}
        </label>
        <button
          type="button"
          className="pl-btn acc pl-new"
          onClick={() => setEditing('new')}
        >
          + {b.newBlock}
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="ph">{b.empty}</div>
      ) : (
        <ul className="pl-list">
          {visible.map((x) => {
            const totals = x.weeks.map((w) => weekTotals(w, templates))
            const avg =
              totals.reduce((a, w) => a + w.totalS, 0) / x.weeks.length
            const count = totals.reduce((a, w) => a + w.count, 0)
            return (
              <li key={x.id} className={`pl-item${x.archived ? ' arch' : ''}`}>
                <button
                  type="button"
                  className="pl-item-main"
                  onClick={() => setEditing(x.id)}
                >
                  <b className="pl-item-name">
                    {x.name}
                    {x.archived && (
                      <span className="pl-tag">{p.archivedTag}</span>
                    )}
                  </b>
                  <span className="wk-meta">
                    {x.weeks.length} {b.weeksCount} · {count} {b.workouts}
                    {avg > 0 && ` · ${formatDuration(avg)} ${b.perWeek}`}
                  </span>
                  {x.notes && <span className="wk-sum">{x.notes}</span>}
                </button>
                <button
                  type="button"
                  className="pl-ico"
                  title={x.archived ? p.restore : p.archive}
                  aria-label={`${x.archived ? p.restore : p.archive}: ${x.name}`}
                  onClick={() => planning.setBlockArchived(x.id, !x.archived)}
                >
                  {x.archived ? <RestoreIcon /> : <ArchiveIcon />}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {editing !== undefined && (
        <BlockDialog
          key={current?.id ?? 'new'}
          block={current}
          templates={templates}
          exercises={planning.exercises}
          onSave={(x) => {
            planning.saveBlock(x)
            close()
          }}
          onApply={(x) => {
            planning.saveBlock(x)
            close()
            setApplying(x)
          }}
          onDuplicate={() => {
            if (current) planning.duplicateBlock(current.id, p.copySuffix)
            close()
          }}
          onArchive={(archived) => {
            if (current) planning.setBlockArchived(current.id, archived)
            close()
          }}
          onDelete={() => {
            if (current) planning.deleteBlock(current.id)
            close()
          }}
          usedInPhases={
            current ? phasesUsing(planning.phases, current.id).length : 0
          }
          onClose={close}
        />
      )}

      {applying && (
        <ApplyDialog
          kind="block"
          sourceId={applying.id}
          name={applying.name}
          weeks={blockWeeks(applying)}
          templates={templates}
          sessions={planning.sessions}
          onApply={planning.apply}
          onClose={() => setApplying(null)}
        />
      )}
    </>
  )
}
