import React from "react";
import { Hono } from "hono";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "../lib/prisma.js";
import { requireRole, type HonoEnv } from "../lib/middleware.js";
import { logAudit } from "../lib/audit.js";
import { computeClotureApercu } from "../lib/compute-cloture.js";
import { computeClotureHash } from "../lib/cloture-hash.js";
import { ClotureDocument } from "../pdf/cloture-pdf.js";
import type { Prisma } from "@souslepommier/database";

export const cloturesRouter = new Hono<HonoEnv>();

cloturesRouter.use("*", requireRole("GERANT"));

cloturesRouter.get("/", async (c) => {
  const clotures = await prisma.clotureCaisse.findMany({
    orderBy: { numeroCloture: "desc" },
    select: {
      id: true,
      numeroCloture: true,
      date: true,
      nbVentes: true,
      totalTTC: true,
    },
  });
  return c.json(
    clotures.map((c) => ({
      ...c,
      date: c.date.toISOString(),
      totalTTC: Number(c.totalTTC),
    })),
  );
});

cloturesRouter.post("/", async (c) => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const existing = await prisma.clotureCaisse.findFirst({
    where: { date: { gte: start, lte: end } },
  });
  if (existing)
    return c.json(
      {
        error: `La journée est déjà clôturée (clôture n°${existing.numeroCloture})`,
      },
      409,
    );

  const apercu = await computeClotureApercu(prisma, now);
  const user = c.get("user");

  const cloture = await prisma.$transaction(
    async (tx) => {
      const last = await tx.clotureCaisse.findFirst({
        orderBy: { numeroCloture: "desc" },
        select: { numeroCloture: true, hashCumulatif: true },
      });
      const numeroCloture = (last?.numeroCloture ?? 0) + 1;
      const hashPrecedent = last?.hashCumulatif ?? "";

      const hash = computeClotureHash({
        numero: numeroCloture,
        date: now.toISOString(),
        totalTTC: apercu.totalTTC.toFixed(4),
        gerantId: user.id,
        hashPrecedent,
      });

      return tx.clotureCaisse.create({
        data: {
          numeroCloture,
          date: now,
          gerantId: user.id,
          nbVentes: apercu.nbVentes,
          totalEspeces: apercu.totalEspeces,
          totalCB: apercu.totalCB,
          totalCheque: apercu.totalCheque,
          totalVirement: apercu.totalVirement,
          totalTR: apercu.totalTR,
          totalVentes: apercu.totalTTC,
          totalHT: apercu.totalHT,
          totalTVA: apercu.totalTVA,
          totalTTC: apercu.totalTTC,
          recapVendeurs: apercu.recapVendeurs as Prisma.InputJsonValue,
          recapTVA: apercu.recapTVA as Prisma.InputJsonValue,
          recapProduits: apercu.recapProduits as Prisma.InputJsonValue,
          ventesAnnulees: apercu.ventesAnnulees as Prisma.InputJsonValue,
          hashCumulatif: hash,
        },
      });
    },
    { isolationLevel: "Serializable" },
  );

  await logAudit({
    userId: user.id,
    action: "CLOTURE_CAISSE",
    entite: "ClotureCaisse",
    entiteId: cloture.id,
    nouvelleValeur: {
      numeroCloture: cloture.numeroCloture,
      totalTTC: Number(cloture.totalTTC),
      nbVentes: cloture.nbVentes,
    },
  });

  return c.json({ id: cloture.id, numeroCloture: cloture.numeroCloture }, 201);
});

cloturesRouter.get("/apercu", async (c) => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const existing = await prisma.clotureCaisse.findFirst({
    where: { date: { gte: start, lte: end } },
    select: { id: true, numeroCloture: true },
  });
  if (existing)
    return c.json({ error: "already_closed", clotureId: existing.id }, 409);

  return c.json(await computeClotureApercu(prisma, now));
});

function serializeCloture(cl: {
  id: string;
  numeroCloture: number;
  date: Date;
  createdAt: Date;
  gerantId: string;
  gerant: { prenom: string; nom: string };
  nbVentes: number;
  totalEspeces: Prisma.Decimal;
  totalCB: Prisma.Decimal;
  totalCheque: Prisma.Decimal;
  totalVirement: Prisma.Decimal;
  totalTR: Prisma.Decimal;
  totalHT: Prisma.Decimal;
  totalTVA: Prisma.Decimal;
  totalTTC: Prisma.Decimal;
  recapVendeurs: Prisma.JsonValue;
  recapTVA: Prisma.JsonValue;
  recapProduits: Prisma.JsonValue;
  ventesAnnulees: Prisma.JsonValue;
  hashCumulatif: string;
}) {
  return {
    id: cl.id,
    numeroCloture: cl.numeroCloture,
    date: cl.date.toISOString(),
    createdAt: cl.createdAt.toISOString(),
    gerantId: cl.gerantId,
    gerantPrenom: cl.gerant.prenom,
    gerantNom: cl.gerant.nom,
    nbVentes: cl.nbVentes,
    totalEspeces: Number(cl.totalEspeces),
    totalCB: Number(cl.totalCB),
    totalCheque: Number(cl.totalCheque),
    totalVirement: Number(cl.totalVirement),
    totalTR: Number(cl.totalTR),
    totalHT: Number(cl.totalHT),
    totalTVA: Number(cl.totalTVA),
    totalTTC: Number(cl.totalTTC),
    recapVendeurs: (cl.recapVendeurs ?? []) as unknown[],
    recapTVA: (cl.recapTVA ?? []) as unknown[],
    recapProduits: (cl.recapProduits ?? []) as unknown[],
    ventesAnnulees: (cl.ventesAnnulees ?? []) as unknown[],
    hashCumulatif: cl.hashCumulatif,
  };
}

cloturesRouter.get("/:id", async (c) => {
  const cl = await prisma.clotureCaisse.findUnique({
    where: { id: c.req.param("id") },
    include: { gerant: { select: { prenom: true, nom: true } } },
  });
  if (!cl) return c.json({ error: "Clôture introuvable" }, 404);
  return c.json(serializeCloture(cl));
});

cloturesRouter.get("/:id/pdf", async (c) => {
  const cl = await prisma.clotureCaisse.findUnique({
    where: { id: c.req.param("id") },
    include: { gerant: { select: { prenom: true, nom: true } } },
  });
  if (!cl) return c.json({ error: "Clôture introuvable" }, 404);

  const config = await prisma.configEntreprise.findUnique({
    where: { id: "default" },
  });
  const raisonSociale = config?.raisonSociale ?? "Sous le Pommier";

  const clotureData = serializeCloture(cl);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(
    React.createElement(ClotureDocument, {
      cloture: clotureData as Parameters<typeof ClotureDocument>[0]["cloture"],
      raisonSociale,
    }) as any,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cloture-${cl.numeroCloture}.pdf"`,
    },
  });
});
