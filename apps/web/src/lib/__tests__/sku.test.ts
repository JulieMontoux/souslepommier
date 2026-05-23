import { describe, it, expect } from 'vitest'
import { generateSKU } from '../sku'

describe('generateSKU', () => {
  it('génère SKU basique nom + emballage', () => {
    expect(generateSKU('Pomme', null, 'VRAC')).toBe('POMME-VRAC')
  })

  it('inclut le poids en KG quand fourni', () => {
    expect(generateSKU('Pomme', 1, 'FILET')).toBe('POMME-1KG-FILET')
  })

  it('normalise les accents', () => {
    expect(generateSKU('Pêche', null, 'BARQUETTE')).toBe('PECHE-BARQUETTE')
  })

  it('normalise les espaces en tirets', () => {
    expect(generateSKU('Pomme Golden', null, 'SAC')).toBe('POMME-GOLD-SAC')
  })

  it('tronque le nom à 10 chars', () => {
    const sku = generateSKU('Pomme Golden Delicious Longue', null, 'VRAC')
    expect(sku.startsWith('POMME-GOLD')).toBe(true)
  })

  it('gère poids décimal', () => {
    expect(generateSKU('Poire', 0.5, 'BARQUETTE')).toBe('POIRE-0.5KG-BARQUETTE')
  })

  it('gère poids null', () => {
    expect(generateSKU('Cerise', null, 'CAISSE')).toBe('CERISE-CAISSE')
  })

  it('gère poids undefined', () => {
    expect(generateSKU('Cerise', undefined, 'PLATEAU')).toBe('CERISE-PLATEAU')
  })

  it('met tout en majuscules', () => {
    expect(generateSKU('pomme', null, 'VRAC')).toBe('POMME-VRAC')
  })

  it('retire les caractères spéciaux', () => {
    expect(generateSKU("Pomme d'or", null, 'VRAC')).toBe('POMME-D-OR-VRAC')
  })
})
