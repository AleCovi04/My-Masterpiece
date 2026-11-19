// File FIT originali nello Storage di Supabase (bucket privato `fit`, una
// cartella per utente). Sul server compressi con gzip, sul dispositivo in
// chiaro, in cache (`fitFiles` di Dexie). Gestione dello spazio: docs/spazio-dati.md.
import type { SupabaseClient } from '@supabase/supabase-js'
import { compressFit, maybeDecompress } from '../../lib/fitCompression'
import type { DataStore } from '../store'

const FIT_BUCKET = 'fit'
/** File per pagina nell'elenco dello Storage. */
const LIST_PAGE = 1000
/** File per richiesta di cancellazione. */
const REMOVE_CHUNK = 500

export type FitCache = Pick<
  DataStore,
  'pendingFitUploads' | 'getFitFile' | 'markFitUploaded'
>

/** Spazio occupato dai FIT di un utente sul server. */
export interface FitUsage {
  count: number
  bytes: number
}

const path = (userId: string, id: string) =>
  `${userId}/${id.replace(/[^\w.-]/g, '_')}.fit`

export function createFitStorage(client: SupabaseClient, cache: FitCache) {
  const bucket = () => client.storage.from(FIT_BUCKET)
  let uploading: Promise<void> | null = null

  /** Carica i file non ancora sul server (uno alla volta; gli errori si riprovano dopo). */
  const uploadPending = (userId: string): Promise<void> => {
    uploading ??= (async () => {
      try {
        for (const id of await cache.pendingFitUploads()) {
          const bytes = await cache.getFitFile(id)
          if (!bytes) continue
          const { error } = await bucket().upload(
            path(userId, id),
            compressFit(bytes),
            { contentType: 'application/octet-stream', upsert: true },
          )
          if (error) {
            console.error('Caricamento del file FIT non riuscito', error)
            return
          }
          await cache.markFitUploaded(id)
        }
      } finally {
        uploading = null
      }
    })()
    return uploading
  }

  /** Scarica il file dal server (compresso o no) e lo tiene in cache; `null` se non c'è. */
  const download = async (
    userId: string,
    id: string,
  ): Promise<Uint8Array | null> => {
    const { data, error } = await bucket().download(path(userId, id))
    if (error || !data) return null
    let bytes: Uint8Array
    try {
      bytes = maybeDecompress(new Uint8Array(await data.arrayBuffer()))
    } catch (e) {
      console.error('File FIT sul server non leggibile', e)
      return null
    }
    await cache.markFitUploaded(id, bytes)
    return bytes
  }

  /** Numero e dimensione (come salvati sul server) dei FIT dell'utente. */
  const usage = async (userId: string): Promise<FitUsage> => {
    let count = 0
    let bytes = 0
    for (let offset = 0; ; offset += LIST_PAGE) {
      const { data, error } = await bucket().list(userId, {
        limit: LIST_PAGE,
        offset,
      })
      if (error) throw error
      for (const f of data ?? []) {
        const size = (f.metadata as { size?: unknown } | null)?.size
        count += 1
        bytes += typeof size === 'number' ? size : 0
      }
      if (!data || data.length < LIST_PAGE) return { count, bytes }
    }
  }

  /**
   * Cancella i percorsi a blocchi. Senza il permesso di cancellazione lo Storage
   * non dà errore ma non cancella nulla: lo si segnala invece di continuare.
   */
  const removePaths = async (paths: string[]): Promise<void> => {
    for (let i = 0; i < paths.length; i += REMOVE_CHUNK) {
      const chunk = paths.slice(i, i + REMOVE_CHUNK)
      const { data, error } = await bucket().remove(chunk)
      if (error) throw error
      if ((data?.length ?? 0) === 0)
        throw new Error(
          'Nessun file cancellato: manca il permesso (riesegui supabase/schema.sql)',
        )
    }
  }

  /** Toglie dal server i FIT indicati (archiviazione). */
  const remove = (userId: string, ids: string[]): Promise<void> =>
    removePaths(ids.map((id) => path(userId, id)))

  /** Toglie dal server tutti i FIT dell'utente ("Ricomincia da zero"). */
  const removeAll = async (userId: string): Promise<void> => {
    for (;;) {
      const { data, error } = await bucket().list(userId, { limit: LIST_PAGE })
      if (error) throw error
      if (!data || data.length === 0) return
      await removePaths(data.map((f) => `${userId}/${f.name}`))
      if (data.length < LIST_PAGE) return
    }
  }

  return { uploadPending, download, usage, remove, removeAll }
}
