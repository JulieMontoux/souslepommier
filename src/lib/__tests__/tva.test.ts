import { describe, it, expect } from 'vitest'
import { calcPrixTTC, calcMontantTVA, calcPrixHT, recapTVA, roundFiscal } from '../tva'

describe('roundFiscal', () => {
  it('arrondit à 2 décimales', () => {
    expect(roundFiscal(1.005)).toBe(1.01)
    expect(roundFiscal(1.004)).toBe(1.0)
    expect(roundFiscal(2.555)).toBe(2.56)
  })
})

describe('calcPrixTTC', () => {
  it('Pomme 1kg 1.14€ HT à 5.5% → 1.20€ TTC', () => {
    expect(calcPrixTTC(1.14, 5.5)).toBe(1.2)
  })

  it('Produit 10€ HT à 20% → 12€ TTC', () => {
    expect(calcPrixTTC(10, 20)).toBe(12.0)
  })

  it('Franchise 0% → TTC = HT', () => {
    expect(calcPrixTTC(5.5, 0)).toBe(5.5)
  })

  it('Produit 2.16€ HT à 5.5% → 2.28€ TTC', () => {
    // Cas issu de l'aperçu ticket
    expect(calcPrixTTC(2.16, 5.5)).toBe(2.28)
  })
})

describe('calcMontantTVA', () => {
  it('1.14€ HT × 5.5% → 0.06€ TVA', () => {
    expect(calcMontantTVA(1.14, 5.5)).toBe(0.06)
  })

  it('10€ HT × 20% → 2€ TVA', () => {
    expect(calcMontantTVA(10, 20)).toBe(2.0)
  })
})

describe('calcPrixHT', () => {
  it('1.20€ TTC à 5.5% → 1.14€ HT', () => {
    expect(calcPrixHT(1.2, 5.5)).toBe(1.14)
  })

  it('12€ TTC à 20% → 10€ HT', () => {
    expect(calcPrixHT(12, 20)).toBe(10.0)
  })
})

describe('recapTVA', () => {
  it('groupe par taux et calcule les montants', () => {
    const lignes = [
      { tauxTVA: 5.5, montantHT: 1.14 },
      { tauxTVA: 5.5, montantHT: 2.28 },
      { tauxTVA: 20, montantHT: 10 },
    ]
    const recap = recapTVA(lignes)
    const tva55 = recap.find((r) => r.taux === 5.5)!
    const tva20 = recap.find((r) => r.taux === 20)!

    expect(tva55.baseHT).toBe(3.42)
    expect(tva55.montantTVA).toBe(0.19)
    expect(tva20.baseHT).toBe(10)
    expect(tva20.montantTVA).toBe(2.0)
  })

  it('retourne tableau vide pour lignes vides', () => {
    expect(recapTVA([])).toEqual([])
  })
})
