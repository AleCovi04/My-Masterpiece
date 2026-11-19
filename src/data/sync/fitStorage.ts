// File FIT originali nello Storage di Supabase (bucket privato `fit`, una
// cartella per utente). Sul dispositivo restano in cache (`fitFiles` di Dexie).
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DataStore } from '../store'

export const FIT_BUCKET = 'fit'

export type FitCache = Pick<
  DataStore,
  'pendingFitUploads' | 'getFitFile' | 'markFitUploaded'
>

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
          const { error } = await bucket().upload(path(userId, id), bytes, {
            contentType: 'application/octet-stream',
            upsert: true,
          })
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

  /** Scarica il file dal server e lo tiene in cache; `null` se non c'è. */
  const download = async (
    userId: string,
    id: string,
  ): Promise<Uint8Array | null> => {
    const { data, error } = await bucket().download(path(userId, id))
    if (error || !data) return null
    const bytes = new Uint8Array(await data.arrayBuffer())
    await cache.markFitUploaded(id, bytes)
    return bytes
  }

  return { uploadPending, download }
}
