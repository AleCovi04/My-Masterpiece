// Lettura dei file: `.fit`, `.zip` (Garmin Connect → Esporta originale) e
// `.fit.gz`. L'SDK di Garmin è grande: si carica solo quando serve.
import { gunzipSync, unzipSync } from 'fflate'
import { parseFit } from './parse'
import type { FitActivity, FitMessages } from './types'

const isZip = (b: Uint8Array) => b[0] === 0x50 && b[1] === 0x4b
const isGzip = (b: Uint8Array) => b[0] === 0x1f && b[1] === 0x8b

/** I file FIT contenuti (uno per un `.fit`, anche più di uno in uno zip). */
export function extractFitFiles(bytes: Uint8Array): Uint8Array[] {
  if (isGzip(bytes)) return extractFitFiles(gunzipSync(bytes))
  if (isZip(bytes)) {
    const files = unzipSync(bytes, {
      filter: (f) => f.name.toLowerCase().endsWith('.fit'),
    })
    return Object.values(files)
  }
  return [bytes]
}

/** Decodifica un FIT; errore se non è un FIT valido. */
export async function decodeFit(bytes: Uint8Array): Promise<FitMessages> {
  const { Decoder, Stream } = await import('@garmin/fitsdk')
  const stream = Stream.fromByteArray(bytes)
  if (!Decoder.isFIT(stream)) throw new Error('not-fit')
  const { messages, errors } = new Decoder(stream).read()
  if (!messages.sessionMesgs?.length && errors.length) throw errors[0]
  return messages as unknown as FitMessages
}

/** Decodifica e legge l'attività (`null` = nessuna frazione di corsa, bici o nuoto). */
export async function readFit(bytes: Uint8Array): Promise<FitActivity | null> {
  return parseFit(await decodeFit(bytes))
}
