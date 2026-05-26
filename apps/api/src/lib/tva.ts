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

export type LigneTVA = { tauxTVA: number; montantHT: number };
export type RecapTVA = { taux: number; baseHT: number; montantTVA: number }[];

export function recapTVA(lignes: LigneTVA[]): RecapTVA {
  const map = new Map<number, number>();
  for (const { tauxTVA, montantHT } of lignes) {
    map.set(tauxTVA, (map.get(tauxTVA) ?? 0) + montantHT);
  }
  return Array.from(map.entries()).map(([taux, baseHT]) => ({
    taux,
    baseHT: roundFiscal(baseHT),
    montantTVA: calcMontantTVA(baseHT, taux),
  }));
}
