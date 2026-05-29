import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireRole, type HonoEnv } from "../lib/middleware.js";
import { parisDayBounds, parisMonthStart } from "../lib/paris-tz.js";
import {
  computeDayStats,
  computePeriodStats,
  computeYearStats,
} from "../lib/compute-stats.js";
import { roundFiscal } from "../lib/tva.js";

export const statsRouter = new Hono<HonoEnv>();

statsRouter.use("*", requireRole("GERANT"));

statsRouter.get("/today", async (c) => {
  return c.json(await computeDayStats(prisma, new Date()));
});

statsRouter.get("/day/:date", async (c) => {
  const d = new Date(c.req.param("date"));
  if (isNaN(d.getTime())) return c.json({ error: "Date invalide" }, 400);
  return c.json(await computeDayStats(prisma, d));
});

statsRouter.get("/period", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  if (!from || !to)
    return c.json({ error: "Paramètres from et to requis" }, 400);
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()))
    return c.json({ error: "Dates invalides" }, 400);
  return c.json(await computePeriodStats(prisma, fromDate, toDate));
});

statsRouter.get("/year/:year", async (c) => {
  const y = parseInt(c.req.param("year"));
  if (isNaN(y) || y < 2000 || y > 2100)
    return c.json({ error: "Année invalide" }, 400);
  return c.json(await computeYearStats(prisma, y));
});

statsRouter.get("/payment-modes", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  const now = new Date();
  const fromDate = from ? new Date(from) : parisMonthStart(now);
  const toEnd = to ? parisDayBounds(new Date(to))[1] : parisDayBounds(now)[1];

  const ventes = await prisma.vente.findMany({
    where: { date: { gte: fromDate, lte: toEnd }, statut: "FINALISEE" },
    include: { paiements: true },
  });

  const map = new Map<string, { montant: number; nbVentes: Set<string> }>();
  for (const v of ventes) {
    for (const p of v.paiements) {
      const net =
        p.mode === "ESPECES"
          ? Number(p.montant) - Number(p.renduMonnaie)
          : Number(p.montant);
      const cur = map.get(p.mode);
      if (cur) {
        cur.montant += net;
        cur.nbVentes.add(v.id);
      } else map.set(p.mode, { montant: net, nbVentes: new Set([v.id]) });
    }
  }
  return c.json(
    Array.from(map.entries())
      .map(([mode, v]) => ({
        mode,
        montant: roundFiscal(v.montant),
        nbVentes: v.nbVentes.size,
      }))
      .sort((a, b) => b.montant - a.montant),
  );
});

statsRouter.get("/products/top", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  const limit = parseInt(c.req.query("limit") ?? "10");
  const now = new Date();
  const fromDate = from ? new Date(from) : parisMonthStart(now);
  const toDate = to ? parisDayBounds(new Date(to))[1] : parisDayBounds(now)[1];

  const ventes = await prisma.vente.findMany({
    where: { date: { gte: fromDate, lte: toDate }, statut: "FINALISEE" },
    include: {
      lignes: {
        include: {
          variante: {
            include: { produit: { select: { id: true, nom: true } } },
          },
        },
      },
    },
  });

  const map = new Map<
    string,
    { nom: string; qte: number; montantHT: number; montantTTC: number }
  >();
  for (const v of ventes) {
    for (const l of v.lignes) {
      const pid = l.variante.produit.id;
      const cur = map.get(pid);
      if (cur) {
        cur.qte += Number(l.qte);
        cur.montantHT += Number(l.montantHT);
        cur.montantTTC += Number(l.montantTTC);
      } else
        map.set(pid, {
          nom: l.variante.produit.nom,
          qte: Number(l.qte),
          montantHT: Number(l.montantHT),
          montantTTC: Number(l.montantTTC),
        });
    }
  }
  return c.json(
    Array.from(map.entries())
      .map(([produitId, v]) => ({ produitId, ...v }))
      .sort((a, b) => b.montantTTC - a.montantTTC)
      .slice(0, limit),
  );
});

statsRouter.get("/export", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  if (!from || !to)
    return c.json({ error: "Paramètres from et to requis" }, 400);

  const ventes = await prisma.vente.findMany({
    where: {
      date: { gte: new Date(from), lte: new Date(to) },
      statut: "FINALISEE",
    },
    include: {
      vendeur: { select: { prenom: true, nom: true } },
      paiements: true,
      lignes: {
        include: {
          variante: { include: { produit: { select: { nom: true } } } },
        },
      },
    },
    orderBy: { date: "asc" },
  });

  const rows = [
    "ticket,date,vendeur,produits,totalHT,totalTTC,paiement",
    ...ventes.map((v) => {
      const produits = v.lignes
        .map((l) => `${l.variante.produit.nom} x${l.qte}`)
        .join("; ");
      const paiement = v.paiements
        .map((p) => `${p.mode}:${Number(p.montant).toFixed(2)}`)
        .join("+");
      return [
        v.numeroTicket,
        new Date(v.date).toISOString(),
        `${v.vendeur.prenom} ${v.vendeur.nom}`,
        `"${produits}"`,
        Number(v.totalHT).toFixed(2),
        Number(v.totalTTC).toFixed(2),
        paiement,
      ].join(",");
    }),
  ].join("\n");

  return new Response(rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ventes-${from}-${to}.csv"`,
    },
  });
});
