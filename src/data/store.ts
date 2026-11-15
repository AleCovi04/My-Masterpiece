// Interfaccia di salvataggio: oggi localStorage, domani Supabase.
// L'app usa solo `DataStore`; per cambiare backend basta un'altra implementazione.
import type { Exercise, IsoDate, Session, WorkoutTemplate } from './types'

export interface DataStore {
  /** Se non ci sono dati genera e salva sedute d'esempio. */
  loadSessions(): Promise<Session[]>
  saveSessions(sessions: Session[]): Promise<void>
  /** Catalogo esercizi; la prima volta parte dagli esercizi delle sedute di esempio. */
  loadExercises(): Promise<Exercise[]>
  saveExercises(exercises: Exercise[]): Promise<void>
  loadTemplates(): Promise<WorkoutTemplate[]>
  saveTemplates(templates: WorkoutTemplate[]): Promise<void>
  /** `null` = "Nel futuro" (data non ancora scelta). */
  loadRaceDate(): Promise<IsoDate | null>
  saveRaceDate(date: IsoDate | null): Promise<void>
}
