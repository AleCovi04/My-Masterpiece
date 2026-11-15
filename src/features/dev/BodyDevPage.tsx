// Pagina di prova TEMPORANEA (/dev/body): non è nel menu e va rimossa a fine prova.
import { useState } from 'react'
import { useTheme } from '../../app/theme'
import {
  BODY_GROUPS,
  BodyMap,
  groupName,
  type BodyGroup,
} from '../../components/body'
import { useI18n } from '../../i18n/context'

const SAMPLE: Partial<Record<BodyGroup, number>> = {
  chest: 18,
  upper_chest: 9,
  front_delts: 12,
  side_delts: 6,
  rear_delts: 4,
  biceps: 8,
  triceps: 10,
  forearms: 2,
  abs: 6,
  obliques: 3,
  lats: 16,
  mid_back: 11,
  upper_traps: 5,
  lower_back: 4,
  quads: 20,
  adductors: 3,
  abductors: 2,
  glutes: 14,
  hamstrings: 9,
  calves: 7,
}

const TEXT = {
  it: {
    title: 'Mappa muscolare (prova)',
    theme: 'Cambia tema',
    select: 'Selezione multipla',
    selected: 'Gruppi selezionati',
    none: 'Nessuno',
    heat: 'Heatmap',
    sets: 'serie',
  },
  en: {
    title: 'Muscle map (test)',
    theme: 'Switch theme',
    select: 'Multiple selection',
    selected: 'Selected groups',
    none: 'None',
    heat: 'Heatmap',
    sets: 'sets',
  },
} as const

export default function BodyDevPage() {
  const { lang } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const [selected, setSelected] = useState<BodyGroup[]>([])
  const x = TEXT[lang]

  return (
    <div className="dev-body">
      <h1>{x.title}</h1>
      <button type="button" className="dev-btn" onClick={toggleTheme}>
        {x.theme} ({theme})
      </button>

      <section>
        <h2>{x.select}</h2>
        <BodyMap
          mode="select"
          multiple
          selected={selected}
          onChange={setSelected}
        />
        <h3>
          {x.selected} ({selected.length}/{BODY_GROUPS.length})
        </h3>
        {selected.length === 0 ? (
          <p>{x.none}</p>
        ) : (
          <ul>
            {selected.map((g) => (
              <li key={g}>
                <code>{g}</code> – {groupName(g, lang)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>{x.heat}</h2>
        <BodyMap
          mode="heat"
          values={SAMPLE}
          formatValue={(v) => `${v} ${x.sets}`}
        />
      </section>

      <style>{`
        .dev-body { display: flex; flex-direction: column; gap: 24px; align-items: stretch; }
        .dev-body h1, .dev-body h2, .dev-body h3 { font-family: var(--f-display); text-transform: uppercase; margin: 0; }
        .dev-body section { display: flex; flex-direction: column; gap: 14px; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 20px; }
        .dev-btn { align-self: flex-start; border: 1px solid var(--line); background: var(--surface); color: var(--text); border-radius: 999px; padding: 9px 16px; font: 600 14px var(--f-body); cursor: pointer; }
      `}</style>
    </div>
  )
}
