import { describe, it, expect, vi } from 'vitest'
import { computeDayStats, computePeriodStats, computeYearStats } from '../compute-stats'

function makeVente(overrides: Record<string, unknown> = {}) {
  return {
    id: 'v1',
    statut: 'FINALISEE',
    date: new Date('2026-05-23T10:00:00'),
    totalHT: 10,
    totalTVA: 0.55,
    totalTTC: 10.55,
    vendeurId: 'user-1',
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

const makePrisma = (responses: unknown[][]) => {
  let callCount = 0
  return {
    vente: {
      findMany: vi.fn().mockImplementation(() => {
        const res = responses[callCount] ?? []
        callCount++
        return Promise.resolve(res)
      }),
    },
  }
}

describe('computeDayStats', () => {
  it('renvoie des zéros pour journée vide', async () => {
    const db = makePrisma([[], []])
    const result = await computeDayStats(db as never, new Date('2026-05-23'))
    expect(result.caHT).toBe(0)
    expect(result.caTTC).toBe(0)
    expect(result.nbVentes).toBe(0)
    expect(result.panierMoyen).toBe(0)
    expect(result.nbVentesAnnulees).toBe(0)
    expect(result.parHeure).toHaveLength(0)
    expect(result.topProduits).toHaveLength(0)
    expect(result.parModePaiement).toHaveLength(0)
    expect(result.parVendeur).toHaveLength(0)
  })

  it("calcule les stats d'une vente finalisee", async () => {
    const vente = makeVente()
    const db = makePrisma([[vente], []])
    const result = await computeDayStats(db as never, new Date('2026-05-23'))
    expect(result.caHT).toBe(10)
    expect(result.caTTC).toBe(10.55)
    expect(result.nbVentes).toBe(1)
    expect(result.panierMoyen).toBe(10.55)
  })

  it('exclut les ventes annulées du CA', async () => {
    const vente = makeVente({ statut: 'ANNULEE' })
    const db = makePrisma([[vente], []])
    const result = await computeDayStats(db as never, new Date('2026-05-23'))
    expect(result.caHT).toBe(0)
    expect(result.nbVentes).toBe(0)
    expect(result.nbVentesAnnulees).toBe(1)
  })

  it('groupe les ventes par heure', async () => {
    const v1 = makeVente({ id: 'v1', date: new Date('2026-05-23T09:00:00') })
    const v2 = makeVente({ id: 'v2', date: new Date('2026-05-23T09:30:00') })
    const v3 = makeVente({ id: 'v3', date: new Date('2026-05-23T11:00:00') })
    const db = makePrisma([[v1, v2, v3], []])
    const result = await computeDayStats(db as never, new Date('2026-05-23'))
    expect(result.parHeure).toHaveLength(2)
    const h9 = result.parHeure.find((h) => h.heure === 9)
    expect(h9?.nbVentes).toBe(2)
  })

  it('group par mode de paiement (CB net, espèces - rendu)', async () => {
    const vente = makeVente({
      paiements: [
        { id: 'p1', mode: 'CB', montant: 5, renduMonnaie: 0 },
        { id: 'p2', mode: 'ESPECES', montant: 10, renduMonnaie: 4.45 },
      ],
    })
    const db = makePrisma([[vente], []])
    const result = await computeDayStats(db as never, new Date('2026-05-23'))
    const cb = result.parModePaiement.find((m) => m.mode === 'CB')
    const esp = result.parModePaiement.find((m) => m.mode === 'ESPECES')
    expect(cb?.montant).toBe(5)
    expect(esp?.montant).toBe(5.55)
  })

  it('groupe par vendeur avec un seul vendeur', async () => {
    const v1 = makeVente({ id: 'v1' })
    const v2 = makeVente({ id: 'v2' })
    const db = makePrisma([[v1, v2], []])
    const result = await computeDayStats(db as never, new Date('2026-05-23'))
    expect(result.parVendeur).toHaveLength(1)
    expect(result.parVendeur[0].nbVentes).toBe(2)
  })

  it('trie par vendeur par caTTC decroissant (2 vendeurs)', async () => {
    const v1 = makeVente({
      id: 'v1',
      vendeurId: 'user-1',
      totalHT: 5,
      totalTTC: 5,
      vendeur: { id: 'user-1', prenom: 'Alice', nom: 'Durand' },
    })
    const v2 = makeVente({
      id: 'v2',
      vendeurId: 'user-2',
      totalHT: 20,
      totalTTC: 20,
      vendeur: { id: 'user-2', prenom: 'Bob', nom: 'Martin' },
    })
    const db = makePrisma([[v1, v2], []])
    const result = await computeDayStats(db as never, new Date('2026-05-23'))
    expect(result.parVendeur).toHaveLength(2)
    expect(result.parVendeur[0].prenom).toBe('Bob')
  })

  it('calcule le top produits', async () => {
    const vente = makeVente({
      lignes: [
        {
          id: 'l1',
          qte: 3,
          tauxTVA: 5.5,
          montantHT: 9,
          montantTVA: 0.5,
          montantTTC: 9.5,
          variante: { produit: { id: 'p1', nom: 'Pomme' } },
        },
        {
          id: 'l2',
          qte: 1,
          tauxTVA: 5.5,
          montantHT: 20,
          montantTVA: 1.1,
          montantTTC: 21.1,
          variante: { produit: { id: 'p2', nom: 'Poire' } },
        },
      ],
    })
    const db = makePrisma([[vente], []])
    const result = await computeDayStats(db as never, new Date('2026-05-23'))
    expect(result.topProduits[0].nom).toBe('Poire')
    expect(result.topProduits[1].nom).toBe('Pomme')
  })

  it('compare avec J-1', async () => {
    const venteToday = makeVente({ totalTTC: 20 })
    const venteJ1 = makeVente({ id: 'v_j1', totalTTC: 15 })
    const db = makePrisma([[venteToday], [venteJ1]])
    const result = await computeDayStats(db as never, new Date('2026-05-23'))
    expect(result.caTTC).toBe(20)
    expect(result.j1CaTTC).toBe(15)
  })

  it('inclut la date ISO de début de journée', async () => {
    const db = makePrisma([[], []])
    const result = await computeDayStats(db as never, new Date('2026-05-23'))
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})

describe('computePeriodStats', () => {
  it('renvoie des zéros pour période vide', async () => {
    const db = makePrisma([[]])
    const result = await computePeriodStats(
      db as never,
      new Date('2026-05-01'),
      new Date('2026-05-31')
    )
    expect(result.caHT).toBe(0)
    expect(result.nbVentes).toBe(0)
    expect(result.parJour).toHaveLength(0)
  })

  it('calcule CA sur période', async () => {
    const v1 = makeVente({
      id: 'v1',
      date: new Date('2026-05-10T10:00:00'),
      totalHT: 50,
      totalTTC: 52.75,
    })
    const v2 = makeVente({
      id: 'v2',
      date: new Date('2026-05-15T14:00:00'),
      totalHT: 30,
      totalTTC: 31.65,
    })
    const db = makePrisma([[v1, v2]])
    const result = await computePeriodStats(
      db as never,
      new Date('2026-05-01'),
      new Date('2026-05-31')
    )
    expect(result.nbVentes).toBe(2)
    expect(result.caHT).toBe(80)
    expect(result.parJour).toHaveLength(2)
  })

  it('exclut les ventes annulées', async () => {
    const vente = makeVente({ statut: 'ANNULEE' })
    const db = makePrisma([[vente]])
    const result = await computePeriodStats(
      db as never,
      new Date('2026-05-01'),
      new Date('2026-05-31')
    )
    expect(result.nbVentes).toBe(0)
    expect(result.caHT).toBe(0)
  })

  it('groupe le CA par jour', async () => {
    const v1 = makeVente({
      id: 'v1',
      date: new Date('2026-05-10T09:00:00'),
      totalHT: 10,
      totalTTC: 10.55,
    })
    const v2 = makeVente({
      id: 'v2',
      date: new Date('2026-05-10T15:00:00'),
      totalHT: 20,
      totalTTC: 21.1,
    })
    const db = makePrisma([[v1, v2]])
    const result = await computePeriodStats(
      db as never,
      new Date('2026-05-01'),
      new Date('2026-05-31')
    )
    expect(result.parJour).toHaveLength(1)
    expect(result.parJour[0].nbVentes).toBe(2)
  })

  it('calcule le panier moyen', async () => {
    const v1 = makeVente({ id: 'v1', totalTTC: 20 })
    const v2 = makeVente({ id: 'v2', totalTTC: 10 })
    const db = makePrisma([[v1, v2]])
    const result = await computePeriodStats(
      db as never,
      new Date('2026-05-01'),
      new Date('2026-05-31')
    )
    expect(result.panierMoyen).toBe(15)
  })
})

describe('computeYearStats', () => {
  it('renvoie 12 mois même sans ventes', async () => {
    const db = makePrisma([[]])
    const result = await computeYearStats(db as never, 2026)
    expect(result.parMois).toHaveLength(12)
    expect(result.parMois.every((m) => m.caTTC === 0)).toBe(true)
  })

  it('affecte les ventes au bon mois', async () => {
    const v = makeVente({ date: new Date('2026-03-15T10:00:00'), totalHT: 100, totalTTC: 105.5 })
    const db = makePrisma([[v]])
    const result = await computeYearStats(db as never, 2026)
    const mars = result.parMois.find((m) => m.mois === 3)
    expect(mars?.caTTC).toBe(105.5)
    expect(mars?.nbVentes).toBe(1)
  })

  it('calcule le top 10 produits avec % CA', async () => {
    const vente = makeVente({
      lignes: [
        {
          id: 'l1',
          qte: 2,
          tauxTVA: 5.5,
          montantHT: 40,
          montantTVA: 2.2,
          montantTTC: 42.2,
          variante: { produit: { id: 'p1', nom: 'Pomme' } },
        },
        {
          id: 'l2',
          qte: 1,
          tauxTVA: 5.5,
          montantHT: 10,
          montantTVA: 0.55,
          montantTTC: 10.55,
          variante: { produit: { id: 'p2', nom: 'Cerise' } },
        },
      ],
      totalHT: 50,
      totalTVA: 2.75,
      totalTTC: 52.75,
    })
    const db = makePrisma([[vente]])
    const result = await computeYearStats(db as never, 2026)
    expect(result.topProduits).toHaveLength(2)
    expect(result.topProduits[0].nom).toBe('Pomme')
    expect(result.topProduits[0].pctCA).toBeGreaterThan(0)
  })

  it('calcule la recap TVA annuelle', async () => {
    const vente = makeVente({
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
    })
    const db = makePrisma([[vente]])
    const result = await computeYearStats(db as never, 2026)
    expect(result.parTVA).toHaveLength(1)
    expect(result.parTVA[0].taux).toBe(5.5)
  })

  it('panierMoyen est 0 si pas de ventes', async () => {
    const db = makePrisma([[]])
    const result = await computeYearStats(db as never, 2026)
    expect(result.panierMoyen).toBe(0)
  })

  it('trie le parJour par ordre chronologique (2 dates)', async () => {
    const v1 = makeVente({
      id: 'v1',
      date: new Date('2026-06-15T10:00:00'),
      totalHT: 10,
      totalTTC: 10.55,
    })
    const v2 = makeVente({
      id: 'v2',
      date: new Date('2026-03-10T10:00:00'),
      totalHT: 20,
      totalTTC: 21.1,
    })
    const db = makePrisma([[v1, v2]])
    const result = await computeYearStats(db as never, 2026)
    const dates = result.parJour.map((d) => d.date)
    expect(dates[0] < dates[1]).toBe(true)
  })

  it('pctCA est 0 si aucun CA (caTTC = 0)', async () => {
    const db = makePrisma([[]])
    const result = await computeYearStats(db as never, 2026)
    expect(result.topProduits.every((p) => p.pctCA === 0)).toBe(true)
  })
})
