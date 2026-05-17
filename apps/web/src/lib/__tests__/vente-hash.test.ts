import { describe, it, expect, beforeAll } from 'vitest'
import { computeVenteHash } from '../vente-hash'

const BASE = {
  numero: 'T-2026-001',
  date: '2026-01-15T10:00:00.000Z',
  totalTTC: '10.50',
  vendeurId: 'user-abc123',
  hashPrecedent: '',
}

describe('computeVenteHash', () => {
  beforeAll(() => {
    process.env.SIGNING_SECRET = 'ci-test-secret'
  })

  it('retourne un hash HMAC-SHA256 (64 hex chars)', () => {
    expect(computeVenteHash(BASE)).toMatch(/^[a-f0-9]{64}$/)
  })

  it('déterministe — même input → même hash', () => {
    expect(computeVenteHash(BASE)).toBe(computeVenteHash(BASE))
  })

  it('hash différent si totalTTC change', () => {
    const h1 = computeVenteHash(BASE)
    const h2 = computeVenteHash({ ...BASE, totalTTC: '10.51' })
    expect(h1).not.toBe(h2)
  })

  it('hash différent si numero change', () => {
    const h1 = computeVenteHash(BASE)
    const h2 = computeVenteHash({ ...BASE, numero: 'T-2026-002' })
    expect(h1).not.toBe(h2)
  })

  it('chaîne : hashPrecedent influence le hash suivant', () => {
    const h1 = computeVenteHash(BASE)
    const h2 = computeVenteHash({ ...BASE, numero: 'T-2026-002', hashPrecedent: h1 })
    const h2tampered = computeVenteHash({ ...BASE, numero: 'T-2026-002', hashPrecedent: 'wrong' })
    expect(h2).not.toBe(h2tampered)
  })

  it('chaîne : modification vente précédente casse toutes les suivantes', () => {
    const h1 = computeVenteHash(BASE)
    const h2 = computeVenteHash({ ...BASE, numero: 'T-2026-002', hashPrecedent: h1 })
    const h3 = computeVenteHash({ ...BASE, numero: 'T-2026-003', hashPrecedent: h2 })

    // Simulate tampering vente 1
    const h1tampered = computeVenteHash({ ...BASE, totalTTC: '0.01' })
    const h2tampered = computeVenteHash({
      ...BASE,
      numero: 'T-2026-002',
      hashPrecedent: h1tampered,
    })
    const h3tampered = computeVenteHash({
      ...BASE,
      numero: 'T-2026-003',
      hashPrecedent: h2tampered,
    })

    expect(h3).not.toBe(h3tampered)
  })

  it('lève une erreur si SIGNING_SECRET manquant', () => {
    const saved = process.env.SIGNING_SECRET
    delete process.env.SIGNING_SECRET
    expect(() => computeVenteHash(BASE)).toThrow('SIGNING_SECRET manquant')
    process.env.SIGNING_SECRET = saved
  })
})
