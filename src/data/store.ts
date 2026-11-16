// Interfaccia di salvataggio: oggi localStorage, domani Supabase.
// L'app usa solo `DataStore`; per cambiare backend basta un'altra implementazione.
import type { Exercise, IsoDate, Session, WorkoutTemplate } from './types'

export interface DataStore {
  /** Solo sedute reali: all'inizio l'elenco è vuoto. */
  loadSessions(): Promise<Session[]>
  saveSessions(sessions: Session[]): Promise<void>
  /** Catalogo esercizi; la prima volta parte da quattro esercizi di base. */
  loadExercises(): Promise<Exercise[]>
  saveExercises(exercises: Exercise[]): Promise<void>
  loadTemplates(): Promise<WorkoutTemplate[]>
  saveTemplates(templates: WorkoutTemplate[]): Promise<void>
  /** `null` = "Nel futuro" (data non ancora scelta). */
  loadRaceDate(): Promise<IsoDate | null>
  saveRaceDate(date: IsoDate | null): Promise<void>
}
