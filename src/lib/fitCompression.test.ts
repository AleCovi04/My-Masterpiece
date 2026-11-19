import { describe, expect, it } from 'vitest'
import { compressFit, isGzip, maybeDecompress } from './fitCompression'

// un FIT finto: intestazione ".FIT" e dati ripetitivi, come i record di un'attività
const fakeFit = () => {
  const out = new Uint8Array(20_000)
  out.set([14, 0x20, 0, 0, 0, 0, 0, 0, 0x2e, 0x46, 0x49, 0x54])
  for (let i = 14; i < out.length; i++) out[i] = (i * 7) % 61
  return out
}

describe('compressione dei FIT', () => {
  it('andata e ritorno senza perdite, e più piccolo', () => {
    const fit = fakeFit()
    const gz = compressFit(fit)
    expect(isGzip(gz)).toBe(true)
    expect(gz.length).toBeLessThan(fit.length)
    expect(maybeDecompress(gz)).toEqual(fit)
  })

  it('i file caricati prima (non compressi) restano invariati', () => {
    const fit = fakeFit()
    expect(isGzip(fit)).toBe(false)
    expect(maybeDecompress(fit)).toBe(fit)
  })
})
