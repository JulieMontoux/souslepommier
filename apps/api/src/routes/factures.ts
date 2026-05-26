import React from "react";
import { Hono } from "hono";
import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "../lib/prisma.js";
import {
  authMiddleware,
  requireRole,
  type HonoEnv,
} from "../lib/middleware.js";
import { logAudit } from "../lib/audit.js";
import { roundFiscal, calcMontantTVA } from "../lib/tva.js";
import { FactureDocument } from "../pdf/facture-pdf.js";
import type { StatutFacture, Prisma } from "@souslepommier/database";

const ligneFactureSchema = z.object({
  designation: z.string().min(1).max(200),
  qte: z.number().positive(),
  prixUnitaireHT: z.number().min(0),
  tauxTVA: z.number().min(0).max(100),
  remise: z.number().min(0).max(100).default(0),
});

const factureCreateSchema = z.object({
  clientId: z.string().min(1),
  venteId: z.string().optional().nullable(),
  dateEcheance: z.string().optional().nullable(),
  dateLivraison: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  lignes: z.array(ligneFactureSchema).min(1),
});

function serializeFacture(f: {
  id: string;
  numero: string;
  clientId: string;
  venteId: string | null;
  dateEmission: Date;
  dateEcheance: Date | null;
  datePaiement: Date | null;
  dateLivraison: Date | null;
  statut: StatutFacture;
  totalHT: Prisma.Decimal;
  totalTVA: Prisma.Decimal;
  totalTTC: Prisma.Decimal;
  notes: string | null;
  factureOriginaleId: string | null;
}) {
  return {
    ...f,
    dateEmission: f.dateEmission.toISOString(),
    dateEcheance: f.dateEcheance?.toISOString() ?? null,
    datePaiement: f.datePaiement?.toISOString() ?? null,
    dateLivraison: f.dateLivraison?.toISOString() ?? null,
    totalHT: Number(f.totalHT),
    totalTVA: Number(f.totalTVA),
    totalTTC: Number(f.totalTTC),
  };
}

export const facturesRouter = new Hono<HonoEnv>();

facturesRouter.use("*", authMiddleware);

facturesRouter.get("/", async (c) => {
  const clientId = c.req.query("clientId");
  const statut = c.req.query("statut");
  const from = c.req.query("from");
  const to = c.req.query("to");
  const q = c.req.query("q");

  const factures = await prisma.facture.findMany({
    where: {
      ...(clientId ? { clientId } : {}),
      ...(statut ? { statut: statut as StatutFacture } : {}),
      ...(from || to
        ? {
            dateEmission: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { numero: { contains: q, mode: "insensitive" } },
              {
                client: { raisonSociale: { contains: q, mode: "insensitive" } },
              },
            ],
          }
        : {}),
    },
    include: { client: { select: { raisonSociale: true } } },
    orderBy: { dateEmission: "desc" },
  });
  return c.json(
    factures.map((f) => ({
      ...serializeFacture(f),
      clientNom: f.client.raisonSociale,
    })),
  );
});

facturesRouter.post("/", requireRole("GERANT"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = factureCreateSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  const client = await prisma.client.findUnique({
    where: { id: parsed.data.clientId },
  });
  if (!client) return c.json({ error: "Client introuvable" }, 404);

  const lignesComputed = parsed.data.lignes.map((l) => {
    const montantHT = roundFiscal(
      l.prixUnitaireHT * l.qte * (1 - l.remise / 100),
    );
    const montantTVA = calcMontantTVA(montantHT, l.tauxTVA);
    return {
      ...l,
      montantHT,
      montantTVA,
      montantTTC: roundFiscal(montantHT + montantTVA),
    };
  });
  const totalHT = roundFiscal(
    lignesComputed.reduce((s, l) => s + l.montantHT, 0),
  );
  const totalTVA = roundFiscal(
    lignesComputed.reduce((s, l) => s + l.montantTVA, 0),
  );
  const totalTTC = roundFiscal(
    lignesComputed.reduce((s, l) => s + l.montantTTC, 0),
  );

  const facture = await prisma.$transaction(async (tx) => {
    const year = new Date().getFullYear();
    const last = await tx.facture.findFirst({
      where: { numero: { startsWith: `F-${year}-` } },
      orderBy: { numero: "desc" },
    });
    let seq = 1;
    if (last) {
      const parts = last.numero.split("-");
      const lastSeq = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    const numero = `F-${year}-${String(seq).padStart(6, "0")}`;

    return tx.facture.create({
      data: {
        numero,
        clientId: parsed.data.clientId,
        venteId: parsed.data.venteId ?? null,
        dateEmission: new Date(),
        dateEcheance: parsed.data.dateEcheance
          ? new Date(parsed.data.dateEcheance)
          : null,
        dateLivraison: parsed.data.dateLivraison
          ? new Date(parsed.data.dateLivraison)
          : null,
        notes: parsed.data.notes ?? null,
        totalHT,
        totalTVA,
        totalTTC,
        statut: "BROUILLON",
        lignes: { create: lignesComputed },
      },
    });
  });

  await logAudit({
    userId: c.get("user").id,
    action: "CREATE_FACTURE",
    entite: "Facture",
    entiteId: facture.id,
    nouvelleValeur: { numero: facture.numero, totalTTC },
  });
  return c.json(serializeFacture(facture), 201);
});

facturesRouter.get("/:id", async (c) => {
  const facture = await prisma.facture.findUnique({
    where: { id: c.req.param("id") },
    include: { client: true, lignes: { orderBy: [{ id: "asc" }] } },
  });
  if (!facture) return c.json({ error: "Facture introuvable" }, 404);

  return c.json({
    ...serializeFacture(facture),
    client: {
      raisonSociale: facture.client.raisonSociale,
      siret: facture.client.siret,
      tvaIntracommunautaire: facture.client.tvaIntracommunautaire,
      adresse: facture.client.adresse,
      codePostal: facture.client.codePostal,
      ville: facture.client.ville,
      pays: facture.client.pays,
      email: facture.client.email,
      telephone: facture.client.telephone,
      conditionsPaiement: facture.client.conditionsPaiement,
    },
    lignes: facture.lignes.map((l) => ({
      id: l.id,
      designation: l.designation,
      qte: Number(l.qte),
      prixUnitaireHT: Number(l.prixUnitaireHT),
      tauxTVA: Number(l.tauxTVA),
      montantHT: Number(l.montantHT),
      montantTVA: Number(l.montantTVA),
      montantTTC: Number(l.montantTTC),
      remise: Number(l.remise),
    })),
  });
});

facturesRouter.patch("/:id/statut", requireRole("GERANT"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = z
    .object({
      statut: z.enum(["BROUILLON", "EMISE", "PAYEE", "ANNULEE", "AVOIR"]),
    })
    .safeParse(body);
  if (!parsed.success) return c.json({ error: "Statut invalide" }, 422);

  const existing = await prisma.facture.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "Facture introuvable" }, 404);

  const data: Record<string, unknown> = { statut: parsed.data.statut };
  if (parsed.data.statut === "PAYEE") data.datePaiement = new Date();

  const facture = await prisma.facture.update({ where: { id }, data });
  await logAudit({
    userId: c.get("user").id,
    action:
      parsed.data.statut === "PAYEE"
        ? "PAY_FACTURE"
        : parsed.data.statut === "EMISE"
          ? "EMIT_FACTURE"
          : "ANNULER_FACTURE",
    entite: "Facture",
    entiteId: id,
    nouvelleValeur: { statut: parsed.data.statut },
  });
  return c.json(serializeFacture(facture));
});

facturesRouter.post("/:id/annuler", requireRole("GERANT"), async (c) => {
  const id = c.req.param("id");
  const existing = await prisma.facture.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "Facture introuvable" }, 404);
  if (existing.statut === "ANNULEE")
    return c.json({ error: "Facture déjà annulée" }, 409);

  const facture = await prisma.facture.update({
    where: { id },
    data: { statut: "ANNULEE" },
  });
  await logAudit({
    userId: c.get("user").id,
    action: "ANNULER_FACTURE",
    entite: "Facture",
    entiteId: id,
    nouvelleValeur: { statut: "ANNULEE" },
  });
  return c.json(serializeFacture(facture));
});

facturesRouter.get("/:id/pdf", async (c) => {
  const facture = await prisma.facture.findUnique({
    where: { id: c.req.param("id") },
    include: { client: true, lignes: { orderBy: [{ id: "asc" }] } },
  });
  if (!facture) return c.json({ error: "Facture introuvable" }, 404);

  const config = await prisma.configEntreprise.findUnique({
    where: { id: "default" },
  });

  const factureData = {
    ...serializeFacture(facture),
    client: {
      raisonSociale: facture.client.raisonSociale,
      siret: facture.client.siret,
      tvaIntracommunautaire: facture.client.tvaIntracommunautaire,
      adresse: facture.client.adresse,
      codePostal: facture.client.codePostal,
      ville: facture.client.ville,
      pays: facture.client.pays,
      email: facture.client.email,
      telephone: facture.client.telephone,
      conditionsPaiement: facture.client.conditionsPaiement,
    },
    lignes: facture.lignes.map((l) => ({
      id: l.id,
      designation: l.designation,
      qte: Number(l.qte),
      prixUnitaireHT: Number(l.prixUnitaireHT),
      tauxTVA: Number(l.tauxTVA),
      montantHT: Number(l.montantHT),
      montantTVA: Number(l.montantTVA),
      montantTTC: Number(l.montantTTC),
      remise: Number(l.remise),
    })),
  };

  const configData = config
    ? {
        raisonSociale: config.raisonSociale,
        formeJuridique: config.formeJuridique,
        capitalSocial: config.capitalSocial
          ? Number(config.capitalSocial)
          : null,
        siret: config.siret,
        tvaIntracommunautaire: config.tvaIntracommunautaire,
        adresse: config.adresse,
        codePostal: config.codePostal,
        ville: config.ville,
        telephone: config.telephone,
        email: config.email,
        iban: config.iban,
        rcs: config.rcs,
        villeRCS: config.villeRCS,
        regimeTVA: config.regimeTVA,
      }
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(
    React.createElement(FactureDocument, {
      facture: factureData,
      config: configData,
    }) as any,
  );

  const isAvoir = !!facture.factureOriginaleId;
  const filename = `${isAvoir ? "avoir" : "facture"}-${facture.numero}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
