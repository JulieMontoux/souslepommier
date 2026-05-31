import { describe, it, expect } from 'vitest'
import { clientCreateSchema } from '../validations/client'

const VALID_BASE = {
  raisonSociale: 'GAEC du Pommier',
  pays: 'FR',
}

describe('clientCreateSchema — OWASP A03 input validation', () => {
  it('valid minimal client', () => {
    expect(clientCreateSchema.safeParse(VALID_BASE).success).toBe(true)
  })

  it('rejects empty raisonSociale', () => {
    expect(clientCreateSchema.safeParse({ ...VALID_BASE, raisonSociale: '' }).success).toBe(false)
  })

  it('rejects raisonSociale > 200 chars', () => {
    expect(
      clientCreateSchema.safeParse({ ...VALID_BASE, raisonSociale: 'a'.repeat(201) }).success
    ).toBe(false)
  })

  describe('SIRET validation — OWASP A03 Luhn check', () => {
    it('accepts valid SIRET (Luhn check passes)', () => {
      // Known valid SIRET: 73282932000074 (INSEE)
      const result = clientCreateSchema.safeParse({ ...VALID_BASE, siret: '73282932000074' })
      expect(result.success).toBe(true)
    })

    it('rejects SIRET that is not 14 digits', () => {
      expect(clientCreateSchema.safeParse({ ...VALID_BASE, siret: '1234' }).success).toBe(false)
    })

    it('rejects SIRET with letters', () => {
      expect(clientCreateSchema.safeParse({ ...VALID_BASE, siret: 'AB282932000074' }).success).toBe(
        false
      )
    })

    it('rejects SIRET failing Luhn check', () => {
      // Same as valid but last digit changed → Luhn fails
      expect(clientCreateSchema.safeParse({ ...VALID_BASE, siret: '73282932000075' }).success).toBe(
        false
      )
    })

    it('accepts null SIRET', () => {
      expect(clientCreateSchema.safeParse({ ...VALID_BASE, siret: null }).success).toBe(true)
    })
  })

  describe('TVA intracommunautaire', () => {
    it('accepts valid FR TVA', () => {
      expect(
        clientCreateSchema.safeParse({ ...VALID_BASE, tvaIntracommunautaire: 'FR73282932000' })
          .success
      ).toBe(true)
    })

    it('rejects wrong format', () => {
      expect(
        clientCreateSchema.safeParse({ ...VALID_BASE, tvaIntracommunautaire: 'DE123456789' })
          .success
      ).toBe(false)
    })

    it('rejects non-numeric after FR prefix', () => {
      expect(
        clientCreateSchema.safeParse({ ...VALID_BASE, tvaIntracommunautaire: 'FRABCDEFGHIJK' })
          .success
      ).toBe(false)
    })

    it('accepts null TVA', () => {
      expect(
        clientCreateSchema.safeParse({ ...VALID_BASE, tvaIntracommunautaire: null }).success
      ).toBe(true)
    })
  })

  describe('Code postal', () => {
    it('accepts 5-digit code postal', () => {
      expect(clientCreateSchema.safeParse({ ...VALID_BASE, codePostal: '75001' }).success).toBe(
        true
      )
    })

    it('rejects 4-digit code postal', () => {
      expect(clientCreateSchema.safeParse({ ...VALID_BASE, codePostal: '7500' }).success).toBe(
        false
      )
    })

    it('rejects code postal with letters', () => {
      expect(clientCreateSchema.safeParse({ ...VALID_BASE, codePostal: '7500A' }).success).toBe(
        false
      )
    })
  })

  describe('Email', () => {
    it('accepts valid email', () => {
      expect(
        clientCreateSchema.safeParse({ ...VALID_BASE, email: 'contact@gaec.fr' }).success
      ).toBe(true)
    })

    it('rejects invalid email', () => {
      expect(clientCreateSchema.safeParse({ ...VALID_BASE, email: 'not-an-email' }).success).toBe(
        false
      )
    })

    it('accepts null email', () => {
      expect(clientCreateSchema.safeParse({ ...VALID_BASE, email: null }).success).toBe(true)
    })
  })

  describe('conditionsPaiement', () => {
    it('defaults to 30', () => {
      const result = clientCreateSchema.safeParse(VALID_BASE)
      expect(result.success && result.data.conditionsPaiement).toBe(30)
    })

    it('accepts 0, 30, 45, 60', () => {
      for (const days of [0, 30, 45, 60]) {
        expect(
          clientCreateSchema.safeParse({ ...VALID_BASE, conditionsPaiement: days }).success
        ).toBe(true)
      }
    })

    it('rejects negative conditions', () => {
      expect(clientCreateSchema.safeParse({ ...VALID_BASE, conditionsPaiement: -1 }).success).toBe(
        false
      )
    })

    it('rejects > 120 days', () => {
      expect(clientCreateSchema.safeParse({ ...VALID_BASE, conditionsPaiement: 121 }).success).toBe(
        false
      )
    })
  })
})
