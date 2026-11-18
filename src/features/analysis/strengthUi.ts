import type { Id, MuscleId } from '../../data/types'

/** Scelte della lista degli esercizi. */
export interface ListFilters {
  query: string
  muscles: MuscleId[]
  hideNever: boolean
}

/** Scelte della scheda Forza, tenute dalla pagina Analisi finché resta aperta. */
export interface StrengthUi extends ListFilters {
  selected: Id | null
}

export const INITIAL_STRENGTH_UI: StrengthUi = {
  selected: null,
  query: '',
  muscles: [],
  hideNever: false,
}
