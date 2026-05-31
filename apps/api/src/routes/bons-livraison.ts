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
import { roundFiscal } from "../lib/tva.js";
import { BonLivraisonDocument } from "../pdf/bon-livraison-pdf.js";
import type { StatutBL, Prisma } from "@souslepommier/database";

const ligneBLSchema = z.object({
  varianteProduitId: z.string().optional().nullable(),
  designation: z.string().min(1).max(200),
  qte: z.number().positive(),
  unite: z.string().max(20).optional().nullable(),
  prixUnitaireHT: z.number().min(0),
  remise: z.number().min(0).max(100).default(0),
});

const blCreateSchema = z.object({
  clientId: z.string().min(1),
  venteId: z.string().optional().nullable(),
  dateLivraison: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  remiseCommerciale: z.number().min(0).max(100).default(0),
  lignes: z.array(ligneBLSchema).min(1),
});

function serializeBL(bl: {
  id: string;
  numero: string;
  clientId: string;
  venteId: string | null;
  dateEmission: Date;
  dateLivraison: Date | null;
  statut: StatutBL;
  totalHT: Prisma.Decimal;
  remiseCommerciale: Prisma.Decimal | null;
  notes: string | null;
}) {
  return {
    ...bl,
    dateEmission: bl.dateEmission.toISOString(),
    dateLivraison: bl.dateLivraison?.toISOString() ?? null,
    totalHT: Number(bl.totalHT),
    remiseCommerciale: bl.remiseCommerciale
      ? Number(bl.remiseCommerciale)
      : null,
  };
}

export const bonsLivraisonRouter = new Hono<HonoEnv>();

bonsLivraisonRouter.use("*", authMiddleware);

bonsLivraisonRouter.get("/", async (c) => {
  const clientId = c.req.query("clientId");
  const statut = c.req.query("statut");
  const from = c.req.query("from");
  const to = c.req.query("to");
  const q = c.req.query("q");

  const bls = await prisma.bonLivraison.findMany({
    where: {
      ...(clientId ? { clientId } : {}),
      ...(statut ? { statut: statut as StatutBL } : {}),
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
    bls.map((bl) => ({
      ...serializeBL(bl),
      clientNom: bl.client.raisonSociale,
    })),
  );
});

bonsLivraisonRouter.post("/", requireRole("GERANT"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = blCreateSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  const client = await prisma.client.findUnique({
    where: { id: parsed.data.clientId },
  });
  if (!client) return c.json({ error: "Client introuvable" }, 404);

  const remisePct = parsed.data.remiseCommerciale ?? 0;
  const factor = 1 - remisePct / 100;

  const lignesComputed = parsed.data.lignes.map((l) => {
    const montantHTBrut = roundFiscal(
      l.prixUnitaireHT * l.qte * (1 - l.remise / 100),
    );
    return {
      varianteProduitId: l.varianteProduitId ?? null,
      designation: l.designation,
      qte: l.qte,
      unite: l.unite ?? null,
      prixUnitaireHT: l.prixUnitaireHT,
      remise: l.remise,
      montantHT: montantHTBrut,
    };
  });

  const totalHTBrut = roundFiscal(
    lignesComputed.reduce((s, l) => s + l.montantHT, 0),
  );
  const totalHT = roundFiscal(totalHTBrut * factor);

  const bl = await prisma.$transaction(async (tx) => {
    const year = new Date().getFullYear();
    const last = await tx.bonLivraison.findFirst({
      where: { numero: { startsWith: `BL-${year}-` } },
      orderBy: { numero: "desc" },
    });
    let seq = 1;
    if (last) {
      const parts = last.numero.split("-");
      const lastSeq = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    const numero = `BL-${year}-${String(seq).padStart(6, "0")}`;

    return tx.bonLivraison.create({
      data: {
        numero,
        clientId: parsed.data.clientId,
        venteId: parsed.data.venteId ?? null,
        dateEmission: new Date(),
        dateLivraison: parsed.data.dateLivraison
          ? new Date(parsed.data.dateLivraison)
          : null,
        notes: parsed.data.notes ?? null,
        remiseCommerciale: remisePct > 0 ? remisePct : null,
        totalHT,
        statut: "BROUILLON",
        lignes: { create: lignesComputed },
      },
    });
  });

  await logAudit({
    userId: c.get("user").id,
    action: "CREATE_FACTURE",
    entite: "BonLivraison",
    entiteId: bl.id,
    nouvelleValeur: { numero: bl.numero, totalHT },
  });

  return c.json(serializeBL(bl), 201);
});

bonsLivraisonRouter.get("/:id", async (c) => {
  const bl = await prisma.bonLivraison.findUnique({
    where: { id: c.req.param("id") },
    include: { client: true, lignes: { orderBy: [{ id: "asc" }] } },
  });
  if (!bl) return c.json({ error: "BL introuvable" }, 404);

  return c.json({
    ...serializeBL(bl),
    client: {
      raisonSociale: bl.client.raisonSociale,
      siret: bl.client.siret,
      tvaIntracommunautaire: bl.client.tvaIntracommunautaire,
      adresse: bl.client.adresse,
      codePostal: bl.client.codePostal,
      ville: bl.client.ville,
      pays: bl.client.pays,
      email: bl.client.email,
      telephone: bl.client.telephone,
    },
    lignes: bl.lignes.map((l) => ({
      id: l.id,
      designation: l.designation,
      qte: Number(l.qte),
      unite: l.unite,
      prixUnitaireHT: Number(l.prixUnitaireHT),
      remise: Number(l.remise),
      montantHT: Number(l.montantHT),
    })),
  });
});

bonsLivraisonRouter.patch("/:id/statut", requireRole("GERANT"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = z
    .object({ statut: z.enum(["BROUILLON", "EMIS", "LIVRE", "ANNULE"]) })
    .safeParse(body);
  if (!parsed.success) return c.json({ error: "Statut invalide" }, 422);

  const existing = await prisma.bonLivraison.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "BL introuvable" }, 404);

  const bl = await prisma.bonLivraison.update({
    where: { id },
    data: { statut: parsed.data.statut },
  });

  await logAudit({
    userId: c.get("user").id,
    action: "EMIT_FACTURE",
    entite: "BonLivraison",
    entiteId: id,
    nouvelleValeur: { statut: parsed.data.statut },
  });

  return c.json(serializeBL(bl));
});

bonsLivraisonRouter.post("/:id/dupliquer", requireRole("GERANT"), async (c) => {
  const id = c.req.param("id");
  const original = await prisma.bonLivraison.findUnique({
    where: { id },
    include: { lignes: { orderBy: [{ id: "asc" }] } },
  });
  if (!original) return c.json({ error: "BL introuvable" }, 404);

  const nouveau = await prisma.$transaction(async (tx) => {
    const year = new Date().getFullYear();
    const last = await tx.bonLivraison.findFirst({
      where: { numero: { startsWith: `BL-${year}-` } },
      orderBy: { numero: "desc" },
    });
    let seq = 1;
    if (last) {
      const parts = last.numero.split("-");
      const lastSeq = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    const numero = `BL-${year}-${String(seq).padStart(6, "0")}`;

    return tx.bonLivraison.create({
      data: {
        numero,
        clientId: original.clientId,
        venteId: null,
        dateEmission: new Date(),
        dateLivraison: null,
        notes: original.notes,
        remiseCommerciale: original.remiseCommerciale,
        totalHT: original.totalHT,
        statut: "BROUILLON",
        lignes: {
          create: original.lignes.map((l) => ({
            designation: l.designation,
            qte: l.qte,
            unite: l.unite,
            prixUnitaireHT: l.prixUnitaireHT,
            remise: l.remise,
            montantHT: l.montantHT,
          })),
        },
      },
    });
  });

  await logAudit({
    userId: c.get("user").id,
    action: "CREATE_FACTURE",
    entite: "BonLivraison",
    entiteId: nouveau.id,
    nouvelleValeur: { numero: nouveau.numero, dupliqueDe: original.numero },
  });

  return c.json(serializeBL(nouveau), 201);
});

bonsLivraisonRouter.get("/:id/pdf", async (c) => {
  const bl = await prisma.bonLivraison.findUnique({
    where: { id: c.req.param("id") },
    include: { client: true, lignes: { orderBy: [{ id: "asc" }] } },
  });
  if (!bl) return c.json({ error: "BL introuvable" }, 404);

  const config = await prisma.configEntreprise.findUnique({
    where: { id: "default" },
  });

  const blData = {
    ...serializeBL(bl),
    client: {
      raisonSociale: bl.client.raisonSociale,
      siret: bl.client.siret,
      tvaIntracommunautaire: bl.client.tvaIntracommunautaire,
      adresse: bl.client.adresse,
      codePostal: bl.client.codePostal,
      ville: bl.client.ville,
      pays: bl.client.pays,
      email: bl.client.email,
      telephone: bl.client.telephone,
    },
    lignes: bl.lignes.map((l) => ({
      id: l.id,
      designation: l.designation,
      qte: Number(l.qte),
      unite: l.unite,
      prixUnitaireHT: Number(l.prixUnitaireHT),
      remise: Number(l.remise),
      montantHT: Number(l.montantHT),
    })),
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
        email: config.email,
      }
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(
    React.createElement(BonLivraisonDocument, {
      bl: blData,
      config: configData,
    }) as any,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bl-${bl.numero}.pdf"`,
    },
  });
});
