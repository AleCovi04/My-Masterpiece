import { useState } from 'react'
import { useI18n } from '../../i18n/context'
import { readPreference, writePreference } from '../../lib/preferences'
import ExercisesTab from './ExercisesTab'
import './planner.css'

const TABS = ['exercises', 'workouts', 'blocks', 'phases'] as const
type Tab = (typeof TABS)[number]
const TAB_KEY = 'mm.plannerTab'

function initialTab(): Tab {
  const v = readPreference(TAB_KEY)
  return TABS.find((t) => t === v) ?? 'exercises'
}

export default function PlannerPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>(initialTab)

  const choose = (next: Tab) => {
    setTab(next)
    writePreference(TAB_KEY, next)
  }

  return (
    <div className="pl">
      <h1 className="pl-title">{t.planner.title}</h1>
      <div className="pl-tabs" role="tablist" aria-label={t.planner.tabsLabel}>
        {TABS.map((id) => (
          <button
            type="button"
            key={id}
            role="tab"
            id={`pl-tab-${id}`}
            aria-selected={tab === id}
            aria-controls="pl-panel"
            onClick={() => choose(id)}
          >
            {t.planner.tabs[id]}
          </button>
        ))}
      </div>
      <div
        className="pl-panel"
        id="pl-panel"
        role="tabpanel"
        aria-labelledby={`pl-tab-${tab}`}
      >
        {tab === 'exercises' ? (
          <ExercisesTab />
        ) : (
          <div className="ph">{t.planner.soon}</div>
        )}
      </div>
    </div>
  )
}
