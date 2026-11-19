// Tipi della sincronizzazione con il server (Supabase).
import type { IsoDateTime } from '../types'

/** Elenchi sincronizzati, più `meta` (data gara e impostazioni). */
export type SyncKind =
  | 'exercises'
  | 'templates'
  | 'sessions'
  | 'blocks'
  | 'phases'
  | 'applications'
  | 'imports'
  | 'meta'

export const LIST_KINDS = [
  'exercises',
  'templates',
  'sessions',
  'blocks',
  'phases',
  'applications',
  'imports',
] as const

export type ListKind = (typeof LIST_KINDS)[number]

/** Voci di `meta` che si sincronizzano (tutte le altre restano sul dispositivo). */
export const META_IDS = ['raceDate', 'settings'] as const
export type MetaId = (typeof META_IDS)[number]

/** Lo stato di una voce, come viaggia tra dispositivo e server. */
export interface SyncChange {
  kind: SyncKind
  id: string
  /** Posizione nell'elenco (0 per `meta`). */
  pos: number
  /** L'entità (o il valore di `meta`); `null` se cancellata. */
  item: unknown
  deleted: boolean
  /** Ora della modifica sul dispositivo: vince la più recente. */
  updatedAt: IsoDateTime
  /** Versione dello schema con cui è stata scritta la voce. */
  schemaVersion: number
}

/** Una voce letta dal server, con l'ora in cui il server l'ha ricevuta. */
export interface RemoteChange extends SyncChange {
  serverAt: IsoDateTime
}

/** Ultima sincronizzazione riuscita su questo dispositivo. */
export interface SyncMeta {
  userId: string
  /** `serverAt` più recente già letto; `null` = mai letto nulla. */
  cursor: IsoDateTime | null
  lastSyncAt: IsoDateTime
}

/** Il lato del dispositivo (implementato da `dexieStore`). */
export interface SyncLocal {
  /** Modifiche locali non ancora inviate. */
  pendingChanges(): Promise<SyncChange[]>
  /** Toglie dalla coda le modifiche inviate (se non sono cambiate nel frattempo). */
  ackChanges(sent: SyncChange[]): Promise<void>
  /** Applica le voci del server più recenti di quelle locali; restituisce quante. */
  applyRemote(changes: SyncChange[]): Promise<number>
  /**
   * Primo collegamento a un account su questo dispositivo: backup, poi
   * - dispositivo appena installato e server con dati: si tengono quelli del server;
   * - altrimenti tutte le voci locali vanno in coda (quelle mai sincronizzate
   *   perdono contro quelle del server con lo stesso id).
   */
  startAccount(remoteHasData: boolean): Promise<void>
  getSyncMeta(): Promise<SyncMeta | null>
  setSyncMeta(meta: SyncMeta | null): Promise<void>
  /** Avvisa a ogni salvataggio locale (per inviare le modifiche). */
  onLocalChange(listener: () => void): () => void
}

/** Il lato del server. */
export interface SyncRemote {
  /** Voci ricevute dal server dopo `since` (tutte se `null`), in ordine di `serverAt`. */
  pull(since: IsoDateTime | null): Promise<RemoteChange[]>
  /** Invia le voci; il server tiene, per ciascuna, la più recente. */
  push(changes: SyncChange[]): Promise<void>
}

/** Ora "zero": le voci mai sincronizzate perdono contro qualsiasi voce del server. */
export const EPOCH: IsoDateTime = '1970-01-01T00:00:00.000Z'
