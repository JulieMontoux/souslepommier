import { describe, it, expect } from 'vitest'
import {
  venteCreateSchema,
  ligneVenteSchema,
  paiementVenteSchema,
  annulationSchema,
} from '../validations/vente'

describe('ligneVenteSchema', () => {
  it('valide une ligne correcte', () => {
    const result = ligneVenteSchema.safeParse({ varianteProduitId: 'var-1', qte: 2 })
    expect(result.success).toBe(true)
  })

  it('rejette varianteProduitId vide', () => {
    const result = ligneVenteSchema.safeParse({ varianteProduitId: '', qte: 1 })
    expect(result.success).toBe(false)
  })

  it('rejette qte négative', () => {
    const result = ligneVenteSchema.safeParse({ varianteProduitId: 'v1', qte: -1 })
    expect(result.success).toBe(false)
  })

  it('rejette qte zero', () => {
    const result = ligneVenteSchema.safeParse({ varianteProduitId: 'v1', qte: 0 })
    expect(result.success).toBe(false)
  })

  it('applique la valeur par défaut remise = 0', () => {
    const result = ligneVenteSchema.safeParse({ varianteProduitId: 'v1', qte: 1 })
    expect(result.success && result.data.remise).toBe(0)
  })

  it('rejette une remise > 100', () => {
    const result = ligneVenteSchema.safeParse({ varianteProduitId: 'v1', qte: 1, remise: 101 })
    expect(result.success).toBe(false)
  })

  it('accepte remise = 100', () => {
    const result = ligneVenteSchema.safeParse({ varianteProduitId: 'v1', qte: 1, remise: 100 })
    expect(result.success).toBe(true)
  })
})

describe('paiementVenteSchema', () => {
  it('valide un paiement CB', () => {
    const result = paiementVenteSchema.safeParse({ mode: 'CB', montant: 10 })
    expect(result.success).toBe(true)
  })

  it('valide tous les modes de paiement', () => {
    for (const mode of ['ESPECES', 'CB', 'CHEQUE', 'VIREMENT', 'TICKET_RESTO']) {
      const result = paiementVenteSchema.safeParse({ mode, montant: 5 })
      expect(result.success).toBe(true)
    }
  })

  it('rejette un mode invalide', () => {
    const result = paiementVenteSchema.safeParse({ mode: 'BITCOIN', montant: 10 })
    expect(result.success).toBe(false)
  })

  it('rejette montant négatif', () => {
    const result = paiementVenteSchema.safeParse({ mode: 'CB', montant: -5 })
    expect(result.success).toBe(false)
  })

  it('accepte une référence optionnelle', () => {
    const result = paiementVenteSchema.safeParse({
      mode: 'CHEQUE',
      montant: 10,
      reference: 'CHQ-001',
    })
    expect(result.success).toBe(true)
  })
})

describe('venteCreateSchema', () => {
  const validData = {
    lignes: [{ varianteProduitId: 'var-1', qte: 1 }],
    paiements: [{ mode: 'CB', montant: 10.55 }],
  }

  it('valide une vente correcte', () => {
    const result = venteCreateSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejette si aucune ligne', () => {
    const result = venteCreateSchema.safeParse({ ...validData, lignes: [] })
    expect(result.success).toBe(false)
  })

  it('rejette si aucun paiement', () => {
    const result = venteCreateSchema.safeParse({ ...validData, paiements: [] })
    expect(result.success).toBe(false)
  })

  it('accepte plusieurs lignes et paiements', () => {
    const result = venteCreateSchema.safeParse({
      lignes: [
        { varianteProduitId: 'v1', qte: 1 },
        { varianteProduitId: 'v2', qte: 3 },
      ],
      paiements: [
        { mode: 'ESPECES', montant: 5 },
        { mode: 'CB', montant: 5.55 },
      ],
    })
    expect(result.success).toBe(true)
  })
})

describe('annulationSchema', () => {
  it('valide un motif court', () => {
    const result = annulationSchema.safeParse({ motif: 'Erreur saisie' })
    expect(result.success).toBe(true)
  })

  it('rejette un motif vide', () => {
    const result = annulationSchema.safeParse({ motif: '' })
    expect(result.success).toBe(false)
  })

  it('rejette un motif > 500 chars', () => {
    const result = annulationSchema.safeParse({ motif: 'a'.repeat(501) })
    expect(result.success).toBe(false)
  })

  it('accepte exactement 500 chars', () => {
    const result = annulationSchema.safeParse({ motif: 'a'.repeat(500) })
    expect(result.success).toBe(true)
  })
})
