// Tabelle di IndexedDB (Dexie): righe salvate e versioni dello schema delle tabelle.
import Dexie, { type DexieOptions, type Table } from 'dexie'
import type { RawData } from './migrations'
import type { BackupReason } from './store'
import type { ListKind, SyncKind } from './sync/types'
import type { IsoDateTime } from './types'

/** Una riga per entità: `pos` conserva l'ordine dell'elenco. */
export interface Row {
  id: string
  pos: number
  item: unknown
  /** Ora dell'ultima modifica (per la sincronizzazione); assente = mai modificata dalla v3. */
  updatedAt?: IsoDateTime
}

interface MetaRow {
  key:
    | 'schemaVersion'
    | 'raceDate'
    | 'lastExportAt'
    | 'legacyImportedAt'
    | 'liveWorkout'
    | 'settings'
    /** Dispositivo appena installato, mai modificato: al primo login vincono i dati del server. */
    | 'pristine'
    /** Ultima sincronizzazione (`SyncMeta`). */
    | 'sync'
    /** Collegamento a intervals.icu (solo su questo dispositivo). */
    | 'intervals'
    /** Non più usata (pulizia automatica tolta nella v1.1): può restare nei database vecchi. */
    | 'lastPurgeAt'
  value: unknown
  /** Solo per `raceDate` e `settings`: ora dell'ultima modifica. */
  updatedAt?: IsoDateTime
}

/** Modifica locale da inviare al server (una per voce: conta l'ultima). */
interface ChangeRow {
  /** `<kind>/<id>` */
  key: string
  kind: SyncKind
  id: string
  updatedAt: IsoDateTime
  deleted: boolean
}

/** File FIT originale (cache locale; `uploaded` = già nello Storage del server). */
interface FitFileRow {
  id: string
  bytes: Uint8Array
  uploaded: 0 | 1
}

interface BackupRow {
  id?: number
  createdAt: IsoDateTime
  reason: BackupReason
  schemaVersion: number
  data: RawData
}

export type ListKey = ListKind

export const changeKey = (kind: SyncKind, id: string) => `${kind}/${id}`

export class MmDb extends Dexie {
  exercises!: Table<Row, string>
  templates!: Table<Row, string>
  sessions!: Table<Row, string>
  blocks!: Table<Row, string>
  phases!: Table<Row, string>
  applications!: Table<Row, string>
  meta!: Table<MetaRow, string>
  backups!: Table<BackupRow, number>
  changes!: Table<ChangeRow, string>
  imports!: Table<Row, string>
  fitFiles!: Table<FitFileRow, string>

  constructor(name: string, options?: DexieOptions) {
    super(name, options)
    // Versione di Dexie = tabelle e indici. Cambia solo se cambiano quelli;
    // la forma dei dati si aggiorna con le migrazioni di `migrations.ts`.
    this.version(1).stores({
      exercises: 'id, pos',
      templates: 'id, pos',
      sessions: 'id, pos',
      meta: 'key',
      backups: '++id',
    })
    // v2: blocchi, fasi e applicazioni al calendario
    this.version(2).stores({
      blocks: 'id, pos',
      phases: 'id, pos',
      applications: 'id, pos',
    })
    // v3: coda delle modifiche da sincronizzare
    this.version(3).stores({
      changes: 'key',
    })
    // v4: attività Garmin importate e file FIT
    this.version(4).stores({
      imports: 'id, pos',
      fitFiles: 'id, uploaded',
    })
  }
}
