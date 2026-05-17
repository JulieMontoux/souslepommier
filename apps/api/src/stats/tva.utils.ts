export function roundFiscal(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100
}
