// Interfaccia di salvataggio: oggi localStorage, domani Supabase.
// L'app usa solo `DataStore`; per cambiare backend basta un'altra implementazione.
import type { IsoDate, Session } from './types'

export interface DataStore {
  /** Se non ci sono dati genera e salva sedute d'esempio. */
  loadSessions(): Promise<Session[]>
  saveSessions(sessions: Session[]): Promise<void>
  /** `null` = "Nel futuro" (data non ancora scelta). */
  loadRaceDate(): Promise<IsoDate | null>
  saveRaceDate(date: IsoDate | null): Promise<void>
}
