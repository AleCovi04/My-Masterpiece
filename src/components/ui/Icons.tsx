import type { ReactNode } from 'react'
import type { Discipline } from '../../data/types'

function Svg({ children, width = 2 }: { children: ReactNode; width?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const MenuIcon = () => (
  <Svg width={2.2}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
)

export const ArchiveIcon = () => (
  <Svg>
    <path d="M3 4h18v4H3zM5 8v12h14V8M10 12h4" />
  </Svg>
)

export const RestoreIcon = () => (
  <Svg>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
  </Svg>
)

export const TrashIcon = () => (
  <Svg>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Svg>
)

export const ChevronIcon = () => (
  <Svg>
    <path d="M15 6l-6 6 6 6" />
  </Svg>
)

export const MoonIcon = () => (
  <Svg>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </Svg>
)

export const SunIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
)

export const CloudIcon = () => (
  <Svg>
    <path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4.75 4.75 0 0 1-.5 9.5z" />
  </Svg>
)

export const OverviewIcon = () => (
  <Svg>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Svg>
)

export const CalendarIcon = () => (
  <Svg>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Svg>
)

export const ForgerIcon = () => (
  <Svg>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M9 3v2h6V3M9 10h6M9 14h6M9 18h3" />
  </Svg>
)

/** Il Piano: tappe verso il traguardo. */
export const PlanIcon = () => (
  <Svg>
    <path d="M4 20V6M4 6h9l-1.5 3L13 12H4" />
    <path d="M15 20h5M17.5 20v-6" />
  </Svg>
)

/** Analisi: barre in crescita. */
export const AnalysisIcon = () => (
  <Svg>
    <path d="M4 20h16M7 16v-4M12 16V8M17 16V5" />
  </Svg>
)

export const DataIcon = () => (
  <Svg>
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  </Svg>
)

export function DisciplineIcon({ discipline }: { discipline: Discipline }) {
  switch (discipline) {
    case 'swim':
      return (
        <Svg>
          <path d="M2 17c2 0 2-1.5 4-1.5S8 17 10 17s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" />
          <path d="M2 21c2 0 2-1.5 4-1.5S8 21 10 21s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" />
          <circle cx="16" cy="6" r="2" />
          <path d="m6 13 4-5 4 3 3-1" />
        </Svg>
      )
    case 'bike':
      return (
        <Svg>
          <circle cx="5.5" cy="17" r="3.5" />
          <circle cx="18.5" cy="17" r="3.5" />
          <path d="M5.5 17 9 9h6l3.5 8M9 9 12 17h3" />
          <circle cx="15" cy="5" r="1.5" />
        </Svg>
      )
    case 'run':
      return (
        <Svg>
          <circle cx="14" cy="4" r="2" />
          <path d="m8 21 3-6 3 2 1 4M6 12l3-4 4 1 3 4 3 1M11 15l2-6" />
        </Svg>
      )
    case 'strength':
      return (
        <Svg>
          <path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12" />
        </Svg>
      )
    case 'brick':
      return (
        <Svg>
          <rect x="3" y="5" width="8" height="5" rx="1" />
          <rect x="13" y="5" width="8" height="5" rx="1" />
          <rect x="8" y="14" width="8" height="5" rx="1" />
          <path d="M7 10v2h5v2M17 10v2h-5" />
        </Svg>
      )
  }
}

/** Icone delle frazioni di un brick in fila, ognuna col colore del suo sport. */
export function LegIcons({ sports }: { sports: Discipline[] }) {
  return (
    <span className="leg-icons" aria-hidden="true">
      {sports.map((d, i) => (
        <span key={i} className="leg-ic" data-discipline={d}>
          <DisciplineIcon discipline={d} />
        </span>
      ))}
    </span>
  )
}
