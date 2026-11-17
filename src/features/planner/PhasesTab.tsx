import { useMemo, useState } from 'react'
import { ArchiveIcon, RestoreIcon } from '../../components/ui/Icons'
import type { Phase } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { phaseWeeks } from '../../lib/blocks'
import { normalizeName } from '../../lib/exercises'
import ApplyDialog from './ApplyDialog'
import PhaseDialog from './PhaseDialog'
import type { usePlanning } from './usePlanning'
import './blocks.css'

type Planning = ReturnType<typeof usePlanning>

/** Planner → Fasi: sequenze di blocchi (Base, Build, Peak, Taper…). */
export default function PhasesTab({ planning }: { planning: Planning }) {
  const { t, lang } = useI18n()
  const p = t.planner
  const f = t.phases
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState<string | undefined>()
  const [applying, setApplying] = useState<Phase | null>(null)
  const { phases, blocks, templates } = planning

  const visible = useMemo(() => {
    const q = normalizeName(query)
    return phases
      .filter(
        (x) =>
          (showArchived || !x.archived) &&
          (!q || normalizeName(x.name).includes(q)),
      )
      .sort((a, c) => a.name.localeCompare(c.name, lang))
  }, [phases, query, showArchived, lang])

  if (planning.loading) return null
  const current =
    editing && editing !== 'new'
      ? (phases.find((x) => x.id === editing) ?? null)
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
          + {f.newPhase}
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="ph">{f.empty}</div>
      ) : (
        <ul className="pl-list">
          {visible.map((x) => {
            const weeks = phaseWeeks(x, blocks).length
            const names = x.blockIds
              .map((id) => blocks.find((b) => b.id === id)?.name ?? '?')
              .join(' → ')
            return (
              <li
                key={x.id}
                className={`pl-item ph-item${x.archived ? ' arch' : ''}`}
                data-phase={x.color}
              >
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
                    {x.blockIds.length} {f.blocksCount} · {weeks}{' '}
                    {t.blocks.weeksCount}
                  </span>
                  {names && <span className="wk-sum">{names}</span>}
                  {x.goal && <span className="wk-meta">{x.goal}</span>}
                </button>
                <button
                  type="button"
                  className="pl-ico"
                  title={x.archived ? p.restore : p.archive}
                  aria-label={`${x.archived ? p.restore : p.archive}: ${x.name}`}
                  onClick={() => planning.setPhaseArchived(x.id, !x.archived)}
                >
                  {x.archived ? <RestoreIcon /> : <ArchiveIcon />}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {editing !== undefined && (
        <PhaseDialog
          key={current?.id ?? 'new'}
          phase={current}
          blocks={blocks}
          templates={templates}
          onSave={(x) => {
            planning.savePhase(x)
            close()
          }}
          onApply={(x) => {
            planning.savePhase(x)
            close()
            setApplying(x)
          }}
          onDuplicate={() => {
            if (current) planning.duplicatePhase(current.id, p.copySuffix)
            close()
          }}
          onArchive={(archived) => {
            if (current) planning.setPhaseArchived(current.id, archived)
            close()
          }}
          onDelete={() => {
            if (current) planning.deletePhase(current.id)
            close()
          }}
          onClose={close}
        />
      )}

      {applying && (
        <ApplyDialog
          kind="phase"
          sourceId={applying.id}
          name={applying.name}
          color={applying.color}
          weeks={phaseWeeks(applying, blocks)}
          templates={templates}
          sessions={planning.sessions}
          onApply={planning.apply}
          onClose={() => setApplying(null)}
        />
      )}
    </>
  )
}
