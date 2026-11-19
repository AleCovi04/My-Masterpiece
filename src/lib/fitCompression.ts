// FIT sul server compressi con gzip (senza perdite): circa metà dello Storage.
// Sul dispositivo restano non compressi. I file caricati prima restano leggibili.
import { gunzipSync, gzipSync } from 'fflate'

/** Comprime un FIT per il caricamento sul server. */
export function compressFit(bytes: Uint8Array): Uint8Array {
  return gzipSync(bytes, { level: 9 })
}

/** Il file è compresso con gzip (inizia con 1f 8b)? */
export const isGzip = (bytes: Uint8Array) =>
  bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b

/** Dal file scaricato al FIT: decomprime se serve, altrimenti lo lascia com'è. */
export function maybeDecompress(bytes: Uint8Array): Uint8Array {
  return isGzip(bytes) ? gunzipSync(bytes) : bytes
}
