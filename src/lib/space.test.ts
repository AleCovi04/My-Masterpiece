import { describe, expect, it } from 'vitest'
import {
  estimateDbBytes,
  formatBytes,
  FREE_STORAGE_BYTES,
  MB,
  spaceLevel,
  spacePct,
} from './space'

describe('spazio sul server', () => {
  it('livelli: sotto 50 %, fino a 80 %, oltre', () => {
    expect(spaceLevel(100 * MB, FREE_STORAGE_BYTES)).toBe('ok')
    expect(spaceLevel(512 * MB, FREE_STORAGE_BYTES)).toBe('warn')
    expect(spaceLevel(819 * MB, FREE_STORAGE_BYTES)).toBe('warn')
    expect(spaceLevel(900 * MB, FREE_STORAGE_BYTES)).toBe('high')
    expect(spaceLevel(1, 0)).toBe('ok')
  })

  it('percentuale per la barra, al massimo 100', () => {
    expect(spacePct(256 * MB, FREE_STORAGE_BYTES)).toBe(25)
    expect(spacePct(2048 * MB, FREE_STORAGE_BYTES)).toBe(100)
  })

  it('formato leggibile', () => {
    expect(formatBytes(0.3 * MB, 'it')).toBe('0,3 MB')
    expect(formatBytes(0.3 * MB, 'en')).toBe('0.3 MB')
    expect(formatBytes(12.4 * MB, 'it')).toBe('12 MB')
    expect(formatBytes(1.25 * 1024 * MB, 'it')).toBe('1,3 GB')
  })

  it('stima del database: il doppio del JSON', () => {
    expect(estimateDbBytes(1000)).toBe(2000)
  })
})
