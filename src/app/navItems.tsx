import type { ReactNode } from 'react'
import {
  AnalysisIcon,
  CalendarIcon,
  PlanIcon,
  DataIcon,
  OverviewIcon,
  PlannerIcon,
} from '../components/ui/Icons'
import type { Dictionary } from '../i18n/it'

export interface NavItem {
  to: string
  end?: boolean
  icon: ReactNode
  label: (t: Dictionary) => string
}

/** Voci di navigazione, condivise da drawer (telefono/tablet) e sidebar (PC). */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', end: true, icon: <OverviewIcon />, label: (t) => t.nav.overview },
  { to: '/calendario', icon: <CalendarIcon />, label: (t) => t.nav.calendar },
  { to: '/piano', icon: <PlanIcon />, label: (t) => t.nav.plan },
  { to: '/forger', icon: <PlannerIcon />, label: (t) => t.nav.planner },
  { to: '/analisi', icon: <AnalysisIcon />, label: (t) => t.nav.analysis },
  { to: '/dati', icon: <DataIcon />, label: (t) => t.nav.data },
]
