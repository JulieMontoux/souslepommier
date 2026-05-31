import { describe, it, expect } from "vitest";
import {
  roundFiscal,
  calcPrixTTC,
  calcMontantTVA,
  calcPrixHT,
  recapTVA,
} from "../../lib/tva.js";

describe("roundFiscal", () => {
  it("rounds to 2 decimals", () => {
    expect(roundFiscal(1.005)).toBe(1.01);
    expect(roundFiscal(1.004)).toBe(1.0);
    expect(roundFiscal(0.1 + 0.2)).toBe(0.3);
  });
  it("handles zero", () => expect(roundFiscal(0)).toBe(0));
  it("handles negative", () => expect(roundFiscal(-1.005)).toBe(-1.0));
  it("handles large numbers", () =>
    expect(roundFiscal(9999.999)).toBe(10000.0));
});

describe("calcPrixTTC", () => {
  it("computes TTC at 20%", () => expect(calcPrixTTC(100, 20)).toBe(120));
  it("computes TTC at 5.5%", () => expect(calcPrixTTC(100, 5.5)).toBe(105.5));
  it("computes TTC at 0%", () => expect(calcPrixTTC(100, 0)).toBe(100));
  it("handles fractional price", () =>
    expect(calcPrixTTC(1.23, 10)).toBe(1.35));
});

describe("calcMontantTVA", () => {
  it("computes TVA at 20%", () => expect(calcMontantTVA(100, 20)).toBe(20));
  it("computes TVA at 5.5%", () => expect(calcMontantTVA(100, 5.5)).toBe(5.5));
  it("zero taux = zero TVA", () => expect(calcMontantTVA(100, 0)).toBe(0));
  it("fiscal rounding", () => expect(calcMontantTVA(33.33, 20)).toBe(6.67));
});

describe("calcPrixHT", () => {
  it("back-converts from TTC at 20%", () =>
    expect(calcPrixHT(120, 20)).toBe(100));
  it("back-converts from TTC at 5.5%", () =>
    expect(calcPrixHT(105.5, 5.5)).toBe(100));
  it("zero taux = same price", () => expect(calcPrixHT(100, 0)).toBe(100));
});

describe("recapTVA", () => {
  it("groups by taux", () => {
    const result = recapTVA([
      { tauxTVA: 20, montantHT: 100 },
      { tauxTVA: 5.5, montantHT: 50 },
      { tauxTVA: 20, montantHT: 200 },
    ]);
    expect(result).toHaveLength(2);
    const r20 = result.find((r) => r.taux === 20)!;
    expect(r20.baseHT).toBe(300);
    expect(r20.montantTVA).toBe(60);
    const r5 = result.find((r) => r.taux === 5.5)!;
    expect(r5.baseHT).toBe(50);
    expect(r5.montantTVA).toBe(2.75);
  });
  it("returns empty array for no lignes", () =>
    expect(recapTVA([])).toEqual([]));
  it("single ligne", () => {
    const result = recapTVA([{ tauxTVA: 10, montantHT: 10 }]);
    expect(result[0]).toEqual({ taux: 10, baseHT: 10, montantTVA: 1 });
  });
});
