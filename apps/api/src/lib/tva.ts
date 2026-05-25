export function roundFiscal(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calcPrixTTC(prixHT: number, tauxTVA: number): number {
  return roundFiscal(prixHT * (1 + tauxTVA / 100));
}

export function calcMontantTVA(prixHT: number, tauxTVA: number): number {
  return roundFiscal(prixHT * (tauxTVA / 100));
}

export function calcPrixHT(prixTTC: number, tauxTVA: number): number {
  return roundFiscal(prixTTC / (1 + tauxTVA / 100));
}
