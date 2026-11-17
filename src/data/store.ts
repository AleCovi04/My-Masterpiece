// Interfaccia di salvataggio: oggi IndexedDB (Dexie), domani anche Supabase.
// L'app usa solo `DataStore`; per cambiare backend basta un'altra implementazione.
import type { ExportFile } from './exportFile'
import type {
  AppData,
  BlockApplication,
  Phase,
  TrainingBlock,
  DataCounts,
  Exercise,
  IsoDate,
  IsoDateTime,
  LiveWorkout,
  Session,
  WorkoutTemplate,
} from './types'

export type BackupReason =
  /** Automatico, all'avvio, se l'ultimo ha più di 7 giorni. */
  | 'auto'
  /** Prima di sostituire i dati con un file importato. */
  | 'pre-import'
  /** Prima di ripristinare un altro backup. */
  | 'pre-restore'
  /** Prima di una migrazione dello schema. */
  | 'pre-migration'

export interface BackupInfo {
  id: number
  createdAt: IsoDateTime
  reason: BackupReason
  schemaVersion: number
  counts: DataCounts
}

export interface DataStore {
  /** Solo sedute reali: all'inizio l'elenco è vuoto. */
  loadSessions(): Promise<Session[]>
  saveSessions(sessions: Session[]): Promise<void>
  /** Catalogo esercizi; la prima volta parte da quattro esercizi di base. */
  loadExercises(): Promise<Exercise[]>
  saveExercises(exercises: Exercise[]): Promise<void>
  loadTemplates(): Promise<WorkoutTemplate[]>
  saveTemplates(templates: WorkoutTemplate[]): Promise<void>
  /** Blocchi di settimane tipo (Planner, Blocchi). */
  loadBlocks(): Promise<TrainingBlock[]>
  saveBlocks(blocks: TrainingBlock[]): Promise<void>
  /** Fasi = sequenze di blocchi (Planner, Fasi). */
  loadPhases(): Promise<Phase[]>
  savePhases(phases: Phase[]): Promise<void>
  /** Blocchi e fasi applicati al calendario. */
  loadApplications(): Promise<BlockApplication[]>
  /** Sedute e applicazioni insieme, in una sola transazione (applica / rimuovi). */
  saveSessionsAndApplications(
    sessions: Session[],
    applications: BlockApplication[],
  ): Promise<void>
  /** `null` = "Nel futuro" (data non ancora scelta). */
  loadRaceDate(): Promise<IsoDate | null>
  saveRaceDate(date: IsoDate | null): Promise<void>
  /** Allenamento di forza in corso (bozza della schermata live); `null` = nessuno. */
  loadLiveWorkout(): Promise<LiveWorkout | null>
  /** Si chiama a ogni azione; `null` cancella la bozza (allenamento terminato). */
  saveLiveWorkout(workout: LiveWorkout | null): Promise<void>

  /** Apre il salvataggio: migrazioni, persistenza, backup automatico. Si può chiamare più volte. */
  init(): Promise<void>
  /** Il browser ha garantito di non cancellare i dati? */
  isPersistent(): Promise<boolean>

  /** Tutti i dati in un file di export (non lo scarica e non lo registra). */
  exportAll(): Promise<ExportFile>
  /** Registra che l'export manuale è stato fatto adesso. */
  markExported(): Promise<void>
  lastExportAt(): Promise<IsoDateTime | null>
  /** Sostituisce tutti i dati (import); prima salva un backup di quelli attuali. */
  replaceAll(data: AppData): Promise<void>

  /** Backup salvati, dal più recente. */
  listBackups(): Promise<BackupInfo[]>
  /** Ripristina un backup (applicando le migrazioni se è vecchio); prima salva i dati attuali. */
  restoreBackup(id: number): Promise<void>
}
