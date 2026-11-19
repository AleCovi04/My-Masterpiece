// Interfaccia di salvataggio: IndexedDB (Dexie), sincronizzato con Supabase.
// L'app usa solo `DataStore`; per cambiare backend basta un'altra implementazione.
import type { ExportFile } from './exportFile'
import type {
  AppData,
  BlockApplication,
  Phase,
  TrainingBlock,
  DataCounts,
  Exercise,
  ImportRecord,
  IsoDate,
  IsoDateTime,
  LiveWorkout,
  Session,
  Settings,
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
  /** Prima del primo collegamento a un account (sincronizzazione). */
  | 'pre-sync'
  /** Prima di "Ricomincia da zero". */
  | 'pre-reset'

export interface BackupInfo {
  id: number
  createdAt: IsoDateTime
  reason: BackupReason
  schemaVersion: number
  counts: DataCounts
}

/** Collegamento a intervals.icu: resta solo sul dispositivo, mai sul server. */
export interface IntervalsLink {
  athleteId: string
  apiKey: string
  /** Ultimo controllo delle attività nuove. */
  lastCheckAt?: IsoDateTime
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
  /** Attività Garmin già importate. */
  loadImports(): Promise<ImportRecord[]>
  saveImports(imports: ImportRecord[]): Promise<void>
  /** Sedute e attività importate insieme, in una sola transazione (import Garmin). */
  saveImport(sessions: Session[], imports: ImportRecord[]): Promise<void>

  /** File FIT originali (cache del dispositivo; i file stanno nello Storage del server). */
  putFitFile(id: string, bytes: Uint8Array): Promise<void>
  getFitFile(id: string): Promise<Uint8Array | null>
  /** File non ancora caricati sul server. */
  pendingFitUploads(): Promise<string[]>
  /** Segna il file come presente sul server (con `bytes`, salva anche una copia scaricata). */
  markFitUploaded(id: string, bytes?: Uint8Array): Promise<void>
  /** Toglie i file dalla cache del dispositivo (archiviazione). */
  deleteFitFiles(ids: string[]): Promise<void>

  /** Collegamento a intervals.icu di questo dispositivo; `null` = non collegato. */
  loadIntervals(): Promise<IntervalsLink | null>
  saveIntervals(link: IntervalsLink | null): Promise<void>

  /** `null` = "Nel futuro" (data non ancora scelta). */
  loadRaceDate(): Promise<IsoDate | null>
  saveRaceDate(date: IsoDate | null): Promise<void>
  /** Impostazioni dell'utente (es. fascia di volume per muscolo). */
  loadSettings(): Promise<Settings>
  saveSettings(settings: Settings): Promise<void>
  /** Allenamento di forza in corso (bozza della schermata live); `null` = nessuno. */
  loadLiveWorkout(): Promise<LiveWorkout | null>
  /** Si chiama a ogni azione; `null` cancella la bozza (allenamento terminato). */
  saveLiveWorkout(workout: LiveWorkout | null): Promise<void>

  /** Avvisa quando arrivano dati da un altro dispositivo (per ricaricare le pagine). */
  subscribe(listener: () => void): () => void

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
  /**
   * "Ricomincia da zero": backup, poi dati come appena installata. Le voci tolte
   * vanno in coda come cancellazioni, così gli altri dispositivi si allineano.
   * Restano login, intervals.icu, preferenze del dispositivo e backup.
   */
  resetAll(): Promise<void>
  /** Rimette in coda tutte le voci e tutti i FIT (per ricaricare il server da questo dispositivo). */
  requeueAll(): Promise<void>
  /** Ultima pulizia delle voci cancellate sul server (solo questo dispositivo). */
  lastPurgeAt(): Promise<IsoDateTime | null>
  markPurged(): Promise<void>

  /** Backup salvati, dal più recente. */
  listBackups(): Promise<BackupInfo[]>
  /** Ripristina un backup (applicando le migrazioni se è vecchio); prima salva i dati attuali. */
  restoreBackup(id: number): Promise<void>
}
