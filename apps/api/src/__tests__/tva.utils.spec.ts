import { roundFiscal } from '../stats/tva.utils'

describe('roundFiscal', () => {
  it('arrondit à 2 décimales', () => {
    expect(roundFiscal(1.005)).toBe(1.01)
    expect(roundFiscal(1.004)).toBe(1.0)
    expect(roundFiscal(2.555)).toBe(2.56)
  })

  it('conserve les entiers', () => {
    expect(roundFiscal(10)).toBe(10)
    expect(roundFiscal(0)).toBe(0)
  })

  it('gère les valeurs négatives', () => {
    expect(roundFiscal(-1.005)).toBe(-1.0)
  })

  it('gère les très petites valeurs', () => {
    expect(roundFiscal(0.001)).toBe(0)
    expect(roundFiscal(0.005)).toBe(0.01)
  })

  it('gère epsilon correctement', () => {
    expect(roundFiscal(1.145)).toBe(1.15)
  })
})
