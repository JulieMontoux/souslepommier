import React from "react";
import { Hono } from "hono";
import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type HonoEnv } from "../lib/middleware.js";
import { logAudit } from "../lib/audit.js";
import { createVente } from "../lib/create-vente.js";
import { recapTVA } from "../lib/tva.js";
import { TicketDocument } from "../pdf/ticket-pdf.js";

const venteCreateSchema = z.object({
  lignes: z
    .array(
      z.object({
        varianteProduitId: z.string().min(1),
        qte: z.number().int().positive(),
        remise: z.number().min(0).max(100).optional(),
      }),
    )
    .min(1),
  paiements: z
    .array(
      z.object({
        mode: z.enum(["ESPECES", "CB", "CHEQUE", "VIREMENT", "TICKET_RESTO"]),
        montant: z.number().positive(),
        reference: z.string().optional(),
        renduMonnaie: z.number().min(0).optional(),
      }),
    )
    .min(1),
});

export const ventesRouter = new Hono<HonoEnv>();

ventesRouter.use("*", authMiddleware);

ventesRouter.get("/", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  const vendeurId = c.req.query("vendeurId");
  const statut = c.req.query("statut");
  const page = parseInt(c.req.query("page") ?? "1", 10);
  const limit = parseInt(c.req.query("limit") ?? "50", 10);
  const skip = (page - 1) * limit;

  const where = {
    ...(vendeurId && { vendeurId }),
    ...(statut && { statut: statut as "OUVERTE" | "FINALISEE" | "ANNULEE" }),
    ...((from || to) && {
      date: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    }),
  };

  const [total, items] = await Promise.all([
    prisma.vente.count({ where }),
    prisma.vente.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: "desc" },
      include: {
        vendeur: { select: { id: true, nom: true, prenom: true } },
        _count: { select: { lignes: true } },
      },
    }),
  ]);

  return c.json({
    data: items,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
});

ventesRouter.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = venteCreateSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  try {
    const vente = await createVente(
      user.id,
      parsed.data.lignes,
      parsed.data.paiements,
    );
    await logAudit({
      userId: user.id,
      action: "CREATE_VENTE",
      entite: "Vente",
      entiteId: vente.id,
      nouvelleValeur: {
        numeroTicket: vente.numeroTicket,
        totalTTC: Number(vente.totalTTC),
      },
    });
    return c.json(vente, 201);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    return c.json(
      { error: e.message ?? "Erreur lors de la création" },
      (e.status as 409 | 404) ?? 500,
    );
  }
});

ventesRouter.get("/today", async (c) => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const ventes = await prisma.vente.findMany({
    where: { date: { gte: startOfDay } },
    include: {
      vendeur: { select: { id: true, nom: true, prenom: true } },
      lignes: { include: { variante: { include: { produit: true } } } },
      paiements: true,
    },
    orderBy: { date: "asc" },
  });
  return c.json(ventes);
});

ventesRouter.get("/:id", async (c) => {
  const vente = await prisma.vente.findUnique({
    where: { id: c.req.param("id") },
    include: {
      vendeur: { select: { id: true, nom: true, prenom: true } },
      lignes: {
        include: {
          variante: {
            include: { produit: { select: { id: true, nom: true } } },
          },
        },
      },
      paiements: true,
    },
  });
  if (!vente) return c.json({ error: "Vente introuvable" }, 404);
  return c.json(vente);
});

ventesRouter.get("/:id/ticket", async (c) => {
  const vente = await prisma.vente.findUnique({
    where: { id: c.req.param("id") },
    include: {
      vendeur: { select: { prenom: true } },
      lignes: {
        include: {
          variante: { include: { produit: { select: { nom: true } } } },
        },
      },
      paiements: true,
    },
  });
  if (!vente) return c.json({ error: "Vente introuvable" }, 404);

  const config = await prisma.configEntreprise.findUnique({
    where: { id: "default" },
  });

  const lignes = vente.lignes.map((l) => ({
    designation: l.variante.produit.nom,
    qte: Number(l.qte),
    prixUnitaireHT: Number(l.prixUnitaireHT),
    tauxTVA: Number(l.tauxTVA),
    montantTTC: Number(l.montantTTC),
    remise: Number(l.remise),
  }));

  const recapTaxes = recapTVA(
    vente.lignes.map((l) => ({
      tauxTVA: Number(l.tauxTVA),
      montantHT: Number(l.montantHT),
    })),
  ).map((r) => ({ taux: r.taux, baseHT: r.baseHT, montantTVA: r.montantTVA }));

  const venteData = {
    id: vente.id,
    numeroTicket: vente.numeroTicket,
    date: vente.date.toISOString(),
    vendeurPrenom: vente.vendeur.prenom,
    lignes,
    paiements: vente.paiements.map((p) => ({
      mode: p.mode,
      montant: Number(p.montant),
      renduMonnaie: Number(p.renduMonnaie),
      reference: p.reference,
    })),
    recapTaxes,
    totalHT: Number(vente.totalHT),
    totalTVA: Number(vente.totalTVA),
    totalTTC: Number(vente.totalTTC),
  };

  const configData = config
    ? {
        raisonSociale: config.raisonSociale,
        siret: config.siret,
        tvaIntracommunautaire: config.tvaIntracommunautaire,
        adresse: config.adresse,
        codePostal: config.codePostal,
        ville: config.ville,
        telephone: config.telephone,
      }
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(
    React.createElement(TicketDocument, {
      vente: venteData,
      config: configData,
    }) as any,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ticket-${vente.numeroTicket}.pdf"`,
    },
  });
});

ventesRouter.post("/:id/annuler", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  const vente = await prisma.vente.findUnique({ where: { id } });
  if (!vente) return c.json({ error: "Vente introuvable" }, 404);
  if (vente.statut !== "FINALISEE")
    return c.json(
      { error: "Seules les ventes finalisées peuvent être annulées" },
      409,
    );

  const updated = await prisma.vente.update({
    where: { id },
    data: { statut: "ANNULEE" },
  });
  await logAudit({
    userId: user.id,
    action: "ANNULER_VENTE",
    entite: "Vente",
    entiteId: id,
    nouvelleValeur: { numeroTicket: vente.numeroTicket },
  });
  return c.json(updated);
});
