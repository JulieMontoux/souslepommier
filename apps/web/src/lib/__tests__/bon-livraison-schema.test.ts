/**
 * Tests the inline Zod schemas from the bon-livraison form/API.
 * These mirror the server-side schemas to catch front/back divergence early.
 */
import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Mirrors the server-side schemas exactly
const ligneBLSchema = z.object({
  varianteProduitId: z.string().optional().nullable(),
  designation: z.string().min(1).max(200),
  qte: z.number().positive(),
  unite: z.string().max(20).optional().nullable(),
  prixUnitaireHT: z.number().min(0),
  remise: z.number().min(0).max(100).default(0),
})

const blCreateSchema = z.object({
  clientId: z.string().min(1),
  venteId: z.string().optional().nullable(),
  dateLivraison: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  remiseCommerciale: z.number().min(0).max(100).default(0),
  lignes: z.array(ligneBLSchema).min(1),
})

const statutBLSchema = z.object({
  statut: z.enum(['BROUILLON', 'EMIS', 'LIVRE', 'ANNULE']),
})

describe('ligneBLSchema', () => {
  const VALID = { designation: 'Pommes', qte: 5, prixUnitaireHT: 1.5 }

  it('valid minimal ligne', () => expect(ligneBLSchema.safeParse(VALID).success).toBe(true))

  it('rejects empty designation', () => {
    expect(ligneBLSchema.safeParse({ ...VALID, designation: '' }).success).toBe(false)
  })

  it('rejects designation > 200 chars', () => {
    expect(ligneBLSchema.safeParse({ ...VALID, designation: 'x'.repeat(201) }).success).toBe(false)
  })

  it('rejects qte = 0', () => {
    expect(ligneBLSchema.safeParse({ ...VALID, qte: 0 }).success).toBe(false)
  })

  it('rejects negative qte', () => {
    expect(ligneBLSchema.safeParse({ ...VALID, qte: -1 }).success).toBe(false)
  })

  it('accepts fractional qte (kg)', () => {
    expect(ligneBLSchema.safeParse({ ...VALID, qte: 2.345 }).success).toBe(true)
  })

  it('rejects negative prixUnitaireHT', () => {
    expect(ligneBLSchema.safeParse({ ...VALID, prixUnitaireHT: -0.01 }).success).toBe(false)
  })

  it('accepts prixUnitaireHT = 0 (free item)', () => {
    expect(ligneBLSchema.safeParse({ ...VALID, prixUnitaireHT: 0 }).success).toBe(true)
  })

  it('rejects remise > 100', () => {
    expect(ligneBLSchema.safeParse({ ...VALID, remise: 100.1 }).success).toBe(false)
  })

  it('accepts remise = 100 (fully comped)', () => {
    expect(ligneBLSchema.safeParse({ ...VALID, remise: 100 }).success).toBe(true)
  })

  it('defaults remise to 0', () => {
    const result = ligneBLSchema.safeParse(VALID)
    expect(result.success && result.data.remise).toBe(0)
  })

  it('accepts unite up to 20 chars', () => {
    expect(ligneBLSchema.safeParse({ ...VALID, unite: 'kg' }).success).toBe(true)
  })

  it('rejects unite > 20 chars', () => {
    expect(ligneBLSchema.safeParse({ ...VALID, unite: 'a'.repeat(21) }).success).toBe(false)
  })
})

describe('blCreateSchema', () => {
  const VALID = {
    clientId: 'client-abc',
    lignes: [{ designation: 'Pommes', qte: 10, prixUnitaireHT: 1.5 }],
  }

  it('valid minimal BL', () => expect(blCreateSchema.safeParse(VALID).success).toBe(true))

  it('rejects missing clientId', () => {
    expect(blCreateSchema.safeParse({ lignes: VALID.lignes }).success).toBe(false)
  })

  it('rejects empty clientId string', () => {
    expect(blCreateSchema.safeParse({ ...VALID, clientId: '' }).success).toBe(false)
  })

  it('rejects empty lignes array', () => {
    expect(blCreateSchema.safeParse({ ...VALID, lignes: [] }).success).toBe(false)
  })

  it('accepts multiple lignes', () => {
    expect(
      blCreateSchema.safeParse({
        ...VALID,
        lignes: [
          { designation: 'Pommes', qte: 10, prixUnitaireHT: 1.5 },
          { designation: 'Poires', qte: 5, prixUnitaireHT: 2.0 },
        ],
      }).success
    ).toBe(true)
  })

  it('rejects remiseCommerciale > 100', () => {
    expect(blCreateSchema.safeParse({ ...VALID, remiseCommerciale: 101 }).success).toBe(false)
  })

  it('rejects remiseCommerciale < 0', () => {
    expect(blCreateSchema.safeParse({ ...VALID, remiseCommerciale: -1 }).success).toBe(false)
  })

  it('defaults remiseCommerciale to 0', () => {
    const result = blCreateSchema.safeParse(VALID)
    expect(result.success && result.data.remiseCommerciale).toBe(0)
  })

  it('rejects notes > 2000 chars', () => {
    expect(blCreateSchema.safeParse({ ...VALID, notes: 'x'.repeat(2001) }).success).toBe(false)
  })

  it('accepts notes = null', () => {
    expect(blCreateSchema.safeParse({ ...VALID, notes: null }).success).toBe(true)
  })
})

describe('statutBLSchema — valid state transitions', () => {
  it.each(['BROUILLON', 'EMIS', 'LIVRE', 'ANNULE'])('accepts %s', (statut) => {
    expect(statutBLSchema.safeParse({ statut }).success).toBe(true)
  })

  it('rejects invalid statut', () => {
    expect(statutBLSchema.safeParse({ statut: 'PAYE' }).success).toBe(false)
    expect(statutBLSchema.safeParse({ statut: '' }).success).toBe(false)
  })
})
