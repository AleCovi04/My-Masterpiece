import { useMemo, useState } from 'react'
import { groupName } from '../../components/body'
import type { Exercise, Id, IsoDate } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { daysBetween, parseIsoDate } from '../../lib/dates'
import { filterByMuscles, normalizeName } from '../../lib/exercises'
import type { ExerciseSummary } from '../../lib/strengthRecords'
import Modal from '../../components/ui/Modal'
import MuscleFilterDialog from '../forger/MuscleFilterDialog'
import type { ListFilters } from './strengthUi'

/** 🏆 se l'ultimo record è di questi giorni (oggi compreso). */
export const RECENT_RECORD_DAYS = 14

interface Props {
  exercises: Exercise[]
  summaries: Map<Id, ExerciseSummary>
  today: IsoDate
  filters: ListFilters
  onFilters: (f: ListFilters) => void
  selected: Id | null
  onSelect: (id: Id) => void
  /** "Indietro": chiude senza cambiare esercizio. */
  onClose: () => void
}

/**
 * Finestra di scelta dell'esercizio: ricerca, filtro per muscolo e card
 * compatte. Si esce solo con "Indietro" (anche Esc) o scegliendo un esercizio.
 */
export default function ExercisePicker({
  exercises,
  summaries,
  today,
  filters,
  onFilters,
  selected,
  onSelect,
  onClose,
}: Props) {
  const { t, lang } = useI18n()
  const a = t.analysis
  const p = t.planner
  const [choosing, setChoosing] = useState(false)
  const set = (patch: Partial<ListFilters>) =>
    onFilters({ ...filters, ...patch })

  const short = (iso: IsoDate) => {
    const d = parseIsoDate(iso)
    return `${d.getDate()} ${t.monthsShort[d.getMonth()]}`
  }
  const kg = (v: number, digits: number) =>
    `${v.toLocaleString(lang, { maximumFractionDigits: digits })} kg`

  // archiviati solo se già fatti; con muscoli scelti l'ordine del Forger
  const { list, sections } = useMemo(() => {
    const q = normalizeName(filters.query)
    const base = exercises.filter((e) => {
      const done = summaries.has(e.id)
      return (
        (done || (!e.archived && !filters.hideNever)) &&
        (!q || normalizeName(e.name).includes(q))
      )
    })
    if (filters.muscles.length > 0) {
      return {
        list: [],
        sections: filterByMuscles(base, filters.muscles, lang),
      }
    }
    const last = (e: Exercise) => summaries.get(e.id)?.lastDate ?? ''
    return {
      list: base.sort(
        (x, y) =>
          last(y).localeCompare(last(x)) || x.name.localeCompare(y.name, lang),
      ),
      sections: null,
    }
  }, [exercises, summaries, filters, lang])

  const total = sections
    ? sections.primary.length + sections.secondary.length
    : list.length

  const card = (e: Exercise) => {
    const s = summaries.get(e.id)
    const trophy =
      !!s?.lastRecordDate &&
      daysBetween(s.lastRecordDate, today) < RECENT_RECORD_DAYS
    const meta = s
      ? [
          s.maxKg !== null && a.cardMax.replace('{v}', kg(s.maxKg, 2)),
          s.setVolume !== null && a.cardSet.replace('{v}', kg(s.setVolume, 0)),
        ]
          .filter(Boolean)
          .join(' · ')
      : a.neverDone
    return (
      <li key={e.id}>
        <button
          type="button"
          className={`st-card${selected === e.id ? ' sel' : ''}${s ? '' : ' never'}`}
          aria-pressed={selected === e.id}
          onClick={() => onSelect(e.id)}
        >
          <span className="st-card-name">
            {e.name}
            {trophy && (
              <span
                className="st-trophy"
                role="img"
                aria-label={a.recentRecord}
                title={a.recentRecord}
              >
                🏆
              </span>
            )}
          </span>
          {s && <span className="st-card-date">{short(s.lastDate)}</span>}
          <span className="st-card-meta">{meta}</span>
        </button>
      </li>
    )
  }

  const muscleText = filters.muscles.map((m) => groupName(m, lang)).join(', ')

  return (
    <Modal
      title={a.pickExerciseTitle}
      closeLabel={a.back}
      onClose={onClose}
      wide
      backdropClose={false}
    >
      <div className="pl-toolbar st-tools">
        <input
          type="search"
          className="pl-inp pl-search"
          placeholder={p.search}
          aria-label={p.search}
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
        />
        <button
          type="button"
          className="pl-btn"
          onClick={() => setChoosing(true)}
        >
          {p.chooseMuscle}
        </button>
        <label className="pl-check">
          <input
            type="checkbox"
            checked={filters.hideNever}
            onChange={(e) => set({ hideNever: e.target.checked })}
          />
          {a.hideNever}
        </label>
      </div>
      {filters.muscles.length > 0 && (
        <span className="st-filter">
          <span>{a.filterBy.replace('{m}', muscleText)}</span>
          <button
            type="button"
            aria-label={a.clearFilter}
            title={a.clearFilter}
            onClick={() => set({ muscles: [] })}
          >
            ✕
          </button>
        </span>
      )}

      {total === 0 ? (
        <p className="note">{a.noExercises}</p>
      ) : sections ? (
        (
          [
            ['primary', p.sectionPrimary],
            ['secondary', p.sectionSecondary],
          ] as const
        ).map(([key, title]) =>
          sections[key].length > 0 ? (
            <div key={key} className="pl-sec">
              <h4 className="pl-sec-h">
                {title} <span>{sections[key].length}</span>
              </h4>
              <ul className="st-cards">
                {sections[key].map((m) => card(m.exercise))}
              </ul>
            </div>
          ) : null,
        )
      ) : (
        <ul className="st-cards">{list.map(card)}</ul>
      )}

      <div className="pl-actions">
        <button type="button" className="pl-btn" onClick={onClose}>
          ← {a.back}
        </button>
      </div>

      {choosing && (
        <MuscleFilterDialog
          selected={filters.muscles}
          onApply={(next) => {
            set({ muscles: next })
            setChoosing(false)
          }}
          onClose={() => setChoosing(false)}
        />
      )}
    </Modal>
  )
}
