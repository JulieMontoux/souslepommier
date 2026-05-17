import { describe, it, expect, beforeAll } from 'vitest'
import { computeClotureHash } from '../cloture-hash'

const BASE = {
  numero: 1,
  date: '2026-01-15T23:59:59.999Z',
  totalTTC: '1250.8000',
  gerantId: 'gerant-abc123',
  hashPrecedent: '',
}

describe('computeClotureHash', () => {
  beforeAll(() => {
    process.env.SIGNING_SECRET = 'ci-test-secret'
  })

  it('retourne un hash HMAC-SHA256 (64 hex chars)', () => {
    expect(computeClotureHash(BASE)).toMatch(/^[a-f0-9]{64}$/)
  })

  it('déterministe — même input → même hash', () => {
    expect(computeClotureHash(BASE)).toBe(computeClotureHash(BASE))
  })

  it('hash différent si totalTTC change', () => {
    const h1 = computeClotureHash(BASE)
    const h2 = computeClotureHash({ ...BASE, totalTTC: '1250.8001' })
    expect(h1).not.toBe(h2)
  })

  it('hash différent si numeroCloture change', () => {
    const h1 = computeClotureHash(BASE)
    const h2 = computeClotureHash({ ...BASE, numero: 2 })
    expect(h1).not.toBe(h2)
  })

  it('chaîne clôtures : hashPrecedent crée dépendance', () => {
    const h1 = computeClotureHash(BASE)
    const h2 = computeClotureHash({ ...BASE, numero: 2, hashPrecedent: h1 })
    const h2tampered = computeClotureHash({ ...BASE, numero: 2, hashPrecedent: 'faux' })
    expect(h2).not.toBe(h2tampered)
  })

  it('lève une erreur si SIGNING_SECRET manquant', () => {
    const saved = process.env.SIGNING_SECRET
    delete process.env.SIGNING_SECRET
    expect(() => computeClotureHash(BASE)).toThrow('SIGNING_SECRET manquant')
    process.env.SIGNING_SECRET = saved
  })
})
