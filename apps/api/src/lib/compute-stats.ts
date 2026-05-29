import { roundFiscal } from "./tva.js";
import {
  parisDateKey,
  parisMonth,
  parisYearBounds,
  parisDayBounds,
} from "./paris-tz.js";
import type { PrismaClient } from "@souslepommier/database";

const PARIS_TZ = "Europe/Paris";

function parisHour(date: Date): number {
  return parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: PARIS_TZ,
      hour: "numeric",
      hour12: false,
    }).format(date),
    10,
  );
}

export type DayStats = {
  date: string;
  caHT: number;
  caTTC: number;
  nbVentes: number;
  panierMoyen: number;
  nbVentesAnnulees: number;
  j1CaTTC: number;
  j1NbVentes: number;
  j1PanierMoyen: number;
  parHeure: { heure: number; caTTC: number; nbVentes: number }[];
  topProduits: {
    produitId: string;
    nom: string;
    qte: number;
    caHT: number;
    caTTC: number;
  }[];
  parModePaiement: { mode: string; montant: number; nbVentes: number }[];
  parVendeur: {
    vendeurId: string;
    prenom: string;
    nom: string;
    nbVentes: number;
    caHT: number;
    caTTC: number;
  }[];
};

export type PeriodStats = {
  from: string;
  to: string;
  caHT: number;
  caTTC: number;
  nbVentes: number;
  panierMoyen: number;
  parJour: { date: string; caHT: number; caTTC: number; nbVentes: number }[];
  n1: {
    caHT: number;
    caTTC: number;
    nbVentes: number;
    panierMoyen: number;
    deltaCA: number | null;
    deltaNbVentes: number | null;
  };
};

export type YearStats = {
  year: number;
  caHT: number;
  caTTC: number;
  nbVentes: number;
  panierMoyen: number;
  parMois: { mois: number; caHT: number; caTTC: number; nbVentes: number }[];
  topProduits: {
    produitId: string;
    nom: string;
    qte: number;
    caHT: number;
    caTTC: number;
    pctCA: number;
  }[];
  parTVA: {
    taux: number;
    montantHT: number;
    montantTVA: number;
    montantTTC: number;
  }[];
  parJour: { date: string; caTTC: number; nbVentes: number }[];
};

type VenteWithRelations = Awaited<ReturnType<typeof fetchVentes>>[number];

async function fetchVentes(db: PrismaClient, gte: Date, lte: Date) {
  return db.vente.findMany({
    where: { date: { gte, lte } },
    include: {
      vendeur: { select: { id: true, prenom: true, nom: true } },
      lignes: {
        include: {
          variante: {
            include: { produit: { select: { id: true, nom: true } } },
          },
        },
      },
      paiements: true,
    },
    orderBy: { date: "asc" },
  });
}

function aggregateVentes(ventes: VenteWithRelations[]) {
  const finalisees = ventes.filter((v) => v.statut === "FINALISEE");
  const annulees = ventes.filter((v) => v.statut === "ANNULEE");

  const caHT = roundFiscal(
    finalisees.reduce((s, v) => s + Number(v.totalHT), 0),
  );
  const caTTC = roundFiscal(
    finalisees.reduce((s, v) => s + Number(v.totalTTC), 0),
  );
  const nbVentes = finalisees.length;
  const panierMoyen = nbVentes > 0 ? roundFiscal(caTTC / nbVentes) : 0;

  return {
    finalisees,
    annulees,
    caHT,
    caTTC,
    nbVentes,
    panierMoyen,
    nbVentesAnnulees: annulees.length,
  };
}

function buildParHeure(finalisees: VenteWithRelations[]) {
  const map = new Map<number, { nbVentes: number; caTTC: number }>();
  for (const v of finalisees) {
    const h = parisHour(v.date);
    const cur = map.get(h);
    if (cur) {
      cur.nbVentes++;
      cur.caTTC += Number(v.totalTTC);
    } else {
      map.set(h, { nbVentes: 1, caTTC: Number(v.totalTTC) });
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([heure, v]) => ({
      heure,
      nbVentes: v.nbVentes,
      caTTC: roundFiscal(v.caTTC),
    }));
}

function buildTopProduits(finalisees: VenteWithRelations[], limit = 5) {
  const map = new Map<
    string,
    { nom: string; qte: number; caHT: number; caTTC: number }
  >();
  for (const v of finalisees) {
    for (const l of v.lignes) {
      const pid = l.variante.produit.id;
      const cur = map.get(pid);
      if (cur) {
        cur.qte += Number(l.qte);
        cur.caHT += Number(l.montantHT);
        cur.caTTC += Number(l.montantTTC);
      } else {
        map.set(pid, {
          nom: l.variante.produit.nom,
          qte: Number(l.qte),
          caHT: Number(l.montantHT),
          caTTC: Number(l.montantTTC),
        });
      }
    }
  }
  return Array.from(map.entries())
    .map(([produitId, v]) => ({
      produitId,
      nom: v.nom,
      qte: roundFiscal(v.qte),
      caHT: roundFiscal(v.caHT),
      caTTC: roundFiscal(v.caTTC),
    }))
    .sort((a, b) => b.caTTC - a.caTTC)
    .slice(0, limit);
}

function buildParModePaiement(finalisees: VenteWithRelations[]) {
  const map = new Map<string, { montant: number; nbVentes: Set<string> }>();
  for (const v of finalisees) {
    for (const p of v.paiements) {
      const net =
        p.mode === "ESPECES"
          ? Number(p.montant) - Number(p.renduMonnaie)
          : Number(p.montant);
      const cur = map.get(p.mode);
      if (cur) {
        cur.montant += net;
        cur.nbVentes.add(v.id);
      } else {
        map.set(p.mode, { montant: net, nbVentes: new Set([v.id]) });
      }
    }
  }
  return Array.from(map.entries())
    .map(([mode, v]) => ({
      mode,
      montant: roundFiscal(v.montant),
      nbVentes: v.nbVentes.size,
    }))
    .sort((a, b) => b.montant - a.montant);
}

function buildParTVA(finalisees: VenteWithRelations[]) {
  const map = new Map<
    number,
    { montantHT: number; montantTVA: number; montantTTC: number }
  >();
  for (const v of finalisees) {
    for (const l of v.lignes) {
      const taux = Number(l.tauxTVA);
      const cur = map.get(taux);
      if (cur) {
        cur.montantHT += Number(l.montantHT);
        cur.montantTVA += Number(l.montantTVA);
        cur.montantTTC += Number(l.montantTTC);
      } else {
        map.set(taux, {
          montantHT: Number(l.montantHT),
          montantTVA: Number(l.montantTVA),
          montantTTC: Number(l.montantTTC),
        });
      }
    }
  }
  return Array.from(map.entries())
    .map(([taux, v]) => ({
      taux,
      montantHT: roundFiscal(v.montantHT),
      montantTVA: roundFiscal(v.montantTVA),
      montantTTC: roundFiscal(v.montantTTC),
    }))
    .sort((a, b) => a.taux - b.taux);
}

function buildParJourYear(finalisees: VenteWithRelations[]) {
  const map = new Map<string, { nbVentes: number; caTTC: number }>();
  for (const v of finalisees) {
    const key = parisDateKey(v.date);
    const cur = map.get(key);
    if (cur) {
      cur.nbVentes++;
      cur.caTTC += Number(v.totalTTC);
    } else {
      map.set(key, { nbVentes: 1, caTTC: Number(v.totalTTC) });
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      nbVentes: v.nbVentes,
      caTTC: roundFiscal(v.caTTC),
    }));
}

function buildParVendeur(finalisees: VenteWithRelations[]) {
  const map = new Map<
    string,
    {
      prenom: string;
      nom: string;
      nbVentes: number;
      caHT: number;
      caTTC: number;
    }
  >();
  for (const v of finalisees) {
    const cur = map.get(v.vendeurId);
    if (cur) {
      cur.nbVentes++;
      cur.caHT += Number(v.totalHT);
      cur.caTTC += Number(v.totalTTC);
    } else {
      map.set(v.vendeurId, {
        prenom: v.vendeur.prenom,
        nom: v.vendeur.nom,
        nbVentes: 1,
        caHT: Number(v.totalHT),
        caTTC: Number(v.totalTTC),
      });
    }
  }
  return Array.from(map.entries())
    .map(([vendeurId, v]) => ({
      vendeurId,
      prenom: v.prenom,
      nom: v.nom,
      nbVentes: v.nbVentes,
      caHT: roundFiscal(v.caHT),
      caTTC: roundFiscal(v.caTTC),
    }))
    .sort((a, b) => b.caTTC - a.caTTC);
}

export async function computeDayStats(
  db: PrismaClient,
  date: Date,
): Promise<DayStats> {
  const [start, end] = parisDayBounds(date);
  const j1 = new Date(date);
  j1.setDate(j1.getDate() - 1);
  const [j1Start, j1End] = parisDayBounds(j1);

  const [ventes, ventesJ1] = await Promise.all([
    fetchVentes(db, start, end),
    fetchVentes(db, j1Start, j1End),
  ]);

  const agg = aggregateVentes(ventes);
  const aggJ1 = aggregateVentes(ventesJ1);

  return {
    date: start.toISOString(),
    caHT: agg.caHT,
    caTTC: agg.caTTC,
    nbVentes: agg.nbVentes,
    panierMoyen: agg.panierMoyen,
    nbVentesAnnulees: agg.nbVentesAnnulees,
    j1CaTTC: aggJ1.caTTC,
    j1NbVentes: aggJ1.nbVentes,
    j1PanierMoyen: aggJ1.panierMoyen,
    parHeure: buildParHeure(agg.finalisees),
    topProduits: buildTopProduits(agg.finalisees),
    parModePaiement: buildParModePaiement(agg.finalisees),
    parVendeur: buildParVendeur(agg.finalisees),
  };
}

export async function computePeriodStats(
  db: PrismaClient,
  from: Date,
  to: Date,
): Promise<PeriodStats> {
  const toEnd = new Date(to);
  toEnd.setHours(23, 59, 59, 999);

  const n1From = new Date(from);
  n1From.setFullYear(n1From.getFullYear() - 1);
  const n1ToEnd = new Date(toEnd);
  n1ToEnd.setFullYear(n1ToEnd.getFullYear() - 1);

  const [ventes, ventesN1] = await Promise.all([
    fetchVentes(db, from, toEnd),
    fetchVentes(db, n1From, n1ToEnd),
  ]);

  const { finalisees, caHT, caTTC, nbVentes, panierMoyen } =
    aggregateVentes(ventes);
  const aggN1 = aggregateVentes(ventesN1);

  const byDay = new Map<
    string,
    { caHT: number; caTTC: number; nbVentes: number }
  >();
  for (const v of finalisees) {
    const key = parisDateKey(v.date);
    const cur = byDay.get(key);
    if (cur) {
      cur.caHT += Number(v.totalHT);
      cur.caTTC += Number(v.totalTTC);
      cur.nbVentes++;
    } else {
      byDay.set(key, {
        caHT: Number(v.totalHT),
        caTTC: Number(v.totalTTC),
        nbVentes: 1,
      });
    }
  }

  const parJour = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      caHT: roundFiscal(v.caHT),
      caTTC: roundFiscal(v.caTTC),
      nbVentes: v.nbVentes,
    }));

  const deltaCA =
    aggN1.caTTC > 0
      ? roundFiscal(((caTTC - aggN1.caTTC) / aggN1.caTTC) * 100)
      : null;
  const deltaNbVentes =
    aggN1.nbVentes > 0
      ? roundFiscal(((nbVentes - aggN1.nbVentes) / aggN1.nbVentes) * 100)
      : null;

  return {
    from: from.toISOString(),
    to: toEnd.toISOString(),
    caHT,
    caTTC,
    nbVentes,
    panierMoyen,
    parJour,
    n1: {
      caHT: aggN1.caHT,
      caTTC: aggN1.caTTC,
      nbVentes: aggN1.nbVentes,
      panierMoyen: aggN1.panierMoyen,
      deltaCA,
      deltaNbVentes,
    },
  };
}

export async function computeYearStats(
  db: PrismaClient,
  year: number,
): Promise<YearStats> {
  const [from, to] = parisYearBounds(year);

  const ventes = await fetchVentes(db, from, to);
  const { finalisees, caHT, caTTC, nbVentes } = aggregateVentes(ventes);

  const byMonth = new Map<
    number,
    { caHT: number; caTTC: number; nbVentes: number }
  >();
  for (const v of finalisees) {
    const m = parisMonth(v.date);
    const cur = byMonth.get(m);
    if (cur) {
      cur.caHT += Number(v.totalHT);
      cur.caTTC += Number(v.totalTTC);
      cur.nbVentes++;
    } else {
      byMonth.set(m, {
        caHT: Number(v.totalHT),
        caTTC: Number(v.totalTTC),
        nbVentes: 1,
      });
    }
  }

  const parMois = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const v = byMonth.get(m) ?? { caHT: 0, caTTC: 0, nbVentes: 0 };
    return {
      mois: m,
      caHT: roundFiscal(v.caHT),
      caTTC: roundFiscal(v.caTTC),
      nbVentes: v.nbVentes,
    };
  });

  const panierMoyen = nbVentes > 0 ? roundFiscal(caTTC / nbVentes) : 0;
  const top = buildTopProduits(finalisees, 10);
  const topProduits = top.map((p) => ({
    ...p,
    pctCA: caTTC > 0 ? roundFiscal((p.caTTC / caTTC) * 100) : 0,
  }));

  return {
    year,
    caHT,
    caTTC,
    nbVentes,
    panierMoyen,
    parMois,
    topProduits,
    parTVA: buildParTVA(finalisees),
    parJour: buildParJourYear(finalisees),
  };
}
