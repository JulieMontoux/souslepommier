import { roundFiscal } from "./tva.js";
import type { PrismaClient } from "@souslepommier/database";

export async function computeClotureApercu(db: PrismaClient, date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const ventes = await db.vente.findMany({
    where: { date: { gte: start, lte: end } },
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

  const finalisees = ventes.filter((v) => v.statut === "FINALISEE");
  const annulees = ventes.filter((v) => v.statut === "ANNULEE");

  let totalEspeces = 0,
    totalCB = 0,
    totalCheque = 0,
    totalVirement = 0,
    totalTR = 0;
  for (const v of finalisees) {
    for (const p of v.paiements) {
      const net = Number(p.montant) - Number(p.renduMonnaie);
      switch (p.mode) {
        case "ESPECES":
          totalEspeces += net;
          break;
        case "CB":
          totalCB += Number(p.montant);
          break;
        case "CHEQUE":
          totalCheque += Number(p.montant);
          break;
        case "VIREMENT":
          totalVirement += Number(p.montant);
          break;
        case "TICKET_RESTO":
          totalTR += Number(p.montant);
          break;
      }
    }
  }

  const vendeurMap = new Map<
    string,
    {
      prenom: string;
      nom: string;
      nbVentes: number;
      totalHT: number;
      totalTTC: number;
    }
  >();
  for (const v of finalisees) {
    const cur = vendeurMap.get(v.vendeurId);
    if (cur) {
      cur.nbVentes++;
      cur.totalHT += Number(v.totalHT);
      cur.totalTTC += Number(v.totalTTC);
    } else
      vendeurMap.set(v.vendeurId, {
        prenom: v.vendeur.prenom,
        nom: v.vendeur.nom,
        nbVentes: 1,
        totalHT: Number(v.totalHT),
        totalTTC: Number(v.totalTTC),
      });
  }

  const tvaMap = new Map<number, { baseHT: number; montantTVA: number }>();
  for (const v of finalisees) {
    for (const l of v.lignes) {
      const taux = Number(l.tauxTVA);
      const cur = tvaMap.get(taux);
      if (cur) {
        cur.baseHT += Number(l.montantHT);
        cur.montantTVA += Number(l.montantTVA);
      } else
        tvaMap.set(taux, {
          baseHT: Number(l.montantHT),
          montantTVA: Number(l.montantTVA),
        });
    }
  }

  const produitMap = new Map<
    string,
    { nom: string; qteTotal: number; montantHT: number }
  >();
  for (const v of finalisees) {
    for (const l of v.lignes) {
      const pid = l.variante.produit.id;
      const cur = produitMap.get(pid);
      if (cur) {
        cur.qteTotal += Number(l.qte);
        cur.montantHT += Number(l.montantHT);
      } else
        produitMap.set(pid, {
          nom: l.variante.produit.nom,
          qteTotal: Number(l.qte),
          montantHT: Number(l.montantHT),
        });
    }
  }

  return {
    date: start.toISOString(),
    nbVentes: finalisees.length,
    totalEspeces: roundFiscal(totalEspeces),
    totalCB: roundFiscal(totalCB),
    totalCheque: roundFiscal(totalCheque),
    totalVirement: roundFiscal(totalVirement),
    totalTR: roundFiscal(totalTR),
    totalHT: roundFiscal(finalisees.reduce((s, v) => s + Number(v.totalHT), 0)),
    totalTVA: roundFiscal(
      finalisees.reduce((s, v) => s + Number(v.totalTVA), 0),
    ),
    totalTTC: roundFiscal(
      finalisees.reduce((s, v) => s + Number(v.totalTTC), 0),
    ),
    recapVendeurs: Array.from(vendeurMap.entries()).map(([vendeurId, v]) => ({
      vendeurId,
      ...v,
      totalHT: roundFiscal(v.totalHT),
      totalTTC: roundFiscal(v.totalTTC),
    })),
    recapTVA: Array.from(tvaMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([taux, v]) => ({
        taux,
        baseHT: roundFiscal(v.baseHT),
        montantTVA: roundFiscal(v.montantTVA),
      })),
    recapProduits: Array.from(produitMap.entries())
      .map(([produitId, v]) => ({
        produitId,
        ...v,
        qteTotal: roundFiscal(v.qteTotal),
        montantHT: roundFiscal(v.montantHT),
      }))
      .sort((a, b) => b.montantHT - a.montantHT)
      .slice(0, 10),
    ventesAnnulees: annulees.map((v) => ({
      numero: v.numeroTicket,
      totalTTC: Number(v.totalTTC),
      motif: v.motifAnnulation ?? null,
      vendeurPrenom: v.vendeur.prenom,
    })),
  };
}
