import { useState, type FormEvent } from 'react'
import { GOAL_MAX } from '../../data/types'
import { useI18n } from '../../i18n/context'

interface Props {
  value: string | undefined
  onChange: (goal: string) => void
}

/** Obiettivo della Panoramica ("Road to …"): un tocco per modificarlo. */
export default function GoalField({ value, onChange }: Props) {
  const { t } = useI18n()
  const o = t.overview
  const [draft, setDraft] = useState<string | null>(null)

  const save = (e?: FormEvent) => {
    e?.preventDefault()
    if (draft === null) return
    if (draft.trim() !== (value ?? '')) onChange(draft)
    setDraft(null)
  }

  return (
    <form className="race" onSubmit={save}>
      <label className="lbl" htmlFor="goal-input">
        {o.goal}
      </label>
      {draft === null ? (
        <button
          className="date-btn"
          type="button"
          onClick={() => setDraft(value ?? '')}
          aria-label={`${o.goal}: ${value ?? o.goalSet}`}
        >
          {value ?? o.goalSet}
        </button>
      ) : (
        <input
          id="goal-input"
          className="date-btn goal-inp"
          value={draft}
          maxLength={GOAL_MAX}
          placeholder={o.goalPlaceholder}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => save()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setDraft(null)
          }}
        />
      )}
    </form>
  )
}
