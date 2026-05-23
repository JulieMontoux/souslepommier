import { describe, it, expect, vi } from 'vitest'
import { computeClotureApercu } from '../compute-cloture'

function makeVente(overrides: Record<string, unknown> = {}) {
  return {
    id: 'v1',
    numeroTicket: 'T-2026-000001',
    statut: 'FINALISEE',
    date: new Date('2026-05-23T10:00:00'),
    totalHT: 10,
    totalTVA: 0.55,
    totalTTC: 10.55,
    vendeurId: 'user-1',
    motifAnnulation: null,
    vendeur: { id: 'user-1', prenom: 'Alice', nom: 'Durand' },
    lignes: [
      {
        id: 'l1',
        qte: 1,
        tauxTVA: 5.5,
        montantHT: 10,
        montantTVA: 0.55,
        montantTTC: 10.55,
        variante: { produit: { id: 'p1', nom: 'Pomme' } },
      },
    ],
    paiements: [{ id: 'pay1', mode: 'CB', montant: 10.55, renduMonnaie: 0 }],
    ...overrides,
  }
}

const makePrisma = (ventes: unknown[]) => ({
  vente: {
    findMany: vi.fn().mockResolvedValue(ventes),
  },
})

describe('computeClotureApercu', () => {
  it('renvoie des zéros pour aucune vente', async () => {
    const db = makePrisma([])
    const result = await computeClotureApercu(db as never, new Date('2026-05-23'))
    expect(result.nbVentes).toBe(0)
    expect(result.totalTTC).toBe(0)
    expect(result.totalEspeces).toBe(0)
    expect(result.totalCB).toBe(0)
    expect(result.recapVendeurs).toHaveLength(0)
    expect(result.recapTVA).toHaveLength(0)
    expect(result.recapProduits).toHaveLength(0)
    expect(result.ventesAnnulees).toHaveLength(0)
  })

  it('calcule les totaux pour une vente CB', async () => {
    const vente = makeVente()
    const db = makePrisma([vente])
    const result = await computeClotureApercu(db as never, new Date('2026-05-23'))
    expect(result.nbVentes).toBe(1)
    expect(result.totalCB).toBe(10.55)
    expect(result.totalEspeces).toBe(0)
    expect(result.totalHT).toBe(10)
    expect(result.totalTTC).toBe(10.55)
  })

  it('calcule espèces avec rendu monnaie', async () => {
    const vente = makeVente({
      paiements: [{ id: 'pay1', mode: 'ESPECES', montant: 15, renduMonnaie: 4.45 }],
    })
    const db = makePrisma([vente])
    const result = await computeClotureApercu(db as never, new Date('2026-05-23'))
    expect(result.totalEspeces).toBe(10.55)
  })

  it('exclut les ventes annulées des totaux', async () => {
    const annulee = makeVente({ statut: 'ANNULEE', motifAnnulation: 'Erreur caissier' })
    const db = makePrisma([annulee])
    const result = await computeClotureApercu(db as never, new Date('2026-05-23'))
    expect(result.nbVentes).toBe(0)
    expect(result.totalTTC).toBe(0)
    expect(result.ventesAnnulees).toHaveLength(1)
    expect(result.ventesAnnulees[0].motif).toBe('Erreur caissier')
  })

  it('agrège plusieurs ventes du même vendeur', async () => {
    const v1 = makeVente({ id: 'v1' })
    const v2 = makeVente({ id: 'v2', totalHT: 5, totalTVA: 0.28, totalTTC: 5.28 })
    const db = makePrisma([v1, v2])
    const result = await computeClotureApercu(db as never, new Date('2026-05-23'))
    expect(result.nbVentes).toBe(2)
    expect(result.recapVendeurs).toHaveLength(1)
    expect(result.recapVendeurs[0].nbVentes).toBe(2)
  })

  it('groupe le recap TVA par taux', async () => {
    const v1 = makeVente({
      lignes: [
        {
          id: 'l1',
          qte: 1,
          tauxTVA: 5.5,
          montantHT: 10,
          montantTVA: 0.55,
          montantTTC: 10.55,
          variante: { produit: { id: 'p1', nom: 'Pomme' } },
        },
        {
          id: 'l2',
          qte: 1,
          tauxTVA: 20,
          montantHT: 5,
          montantTVA: 1,
          montantTTC: 6,
          variante: { produit: { id: 'p2', nom: 'Panier' } },
        },
      ],
    })
    const db = makePrisma([v1])
    const result = await computeClotureApercu(db as never, new Date('2026-05-23'))
    expect(result.recapTVA).toHaveLength(2)
    const tva55 = result.recapTVA.find((r) => r.taux === 5.5)
    const tva20 = result.recapTVA.find((r) => r.taux === 20)
    expect(tva55?.baseHT).toBe(10)
    expect(tva20?.baseHT).toBe(5)
  })

  it('trie le recap produits par montant HT décroissant', async () => {
    const vente = makeVente({
      lignes: [
        {
          id: 'l1',
          qte: 2,
          tauxTVA: 5.5,
          montantHT: 3,
          montantTVA: 0.17,
          montantTTC: 3.17,
          variante: { produit: { id: 'p1', nom: 'Cerise' } },
        },
        {
          id: 'l2',
          qte: 5,
          tauxTVA: 5.5,
          montantHT: 20,
          montantTVA: 1.1,
          montantTTC: 21.1,
          variante: { produit: { id: 'p2', nom: 'Pomme' } },
        },
      ],
    })
    const db = makePrisma([vente])
    const result = await computeClotureApercu(db as never, new Date('2026-05-23'))
    expect(result.recapProduits[0].nom).toBe('Pomme')
    expect(result.recapProduits[1].nom).toBe('Cerise')
  })

  it('calcule cheque, virement, ticket resto', async () => {
    const vente = makeVente({
      paiements: [
        { id: 'p1', mode: 'CHEQUE', montant: 5, renduMonnaie: 0 },
        { id: 'p2', mode: 'VIREMENT', montant: 3, renduMonnaie: 0 },
        { id: 'p3', mode: 'TICKET_RESTO', montant: 2.55, renduMonnaie: 0 },
      ],
    })
    const db = makePrisma([vente])
    const result = await computeClotureApercu(db as never, new Date('2026-05-23'))
    expect(result.totalCheque).toBe(5)
    expect(result.totalVirement).toBe(3)
    expect(result.totalTR).toBe(2.55)
  })

  it('inclut la date ISO de début de journée', async () => {
    const db = makePrisma([])
    const date = new Date('2026-05-23T15:30:00')
    const result = await computeClotureApercu(db as never, date)
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})
