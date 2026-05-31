import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authMiddleware,
  requireRole,
  type HonoEnv,
} from "../lib/middleware.js";
import { calcPrixTTC } from "../lib/tva.js";

const createVarianteSchema = z.object({
  produitId: z.string().min(1),
  prixHT: z.number().min(0),
  tauxTVA: z.number().min(0),
  emballage: z
    .enum(["VRAC", "BARQUETTE", "FILET", "SAC", "CAISSE", "PLATEAU"])
    .optional(),
  poids: z.number().min(0).optional().nullable(),
  sku: z.string().optional().nullable(),
  venteAuPoids: z.boolean().optional(),
});

const updateVarianteSchema = z.object({
  prixHT: z.number().min(0).optional(),
  tauxTVA: z.number().min(0).optional(),
  emballage: z
    .enum(["VRAC", "BARQUETTE", "FILET", "SAC", "CAISSE", "PLATEAU"])
    .optional(),
  poids: z.number().min(0).optional().nullable(),
  sku: z.string().optional().nullable(),
  venteAuPoids: z.boolean().optional(),
  stockMin: z.number().min(0).optional().nullable(),
});

export const variantesRouter = new Hono<HonoEnv>();

variantesRouter.use("*", authMiddleware);

variantesRouter.get("/", async (c) => {
  const produitId = c.req.query("produitId") ?? undefined;
  const variantes = await prisma.varianteProduit.findMany({
    where: produitId ? { produitId } : {},
    orderBy: { poids: "asc" },
  });
  return c.json(variantes);
});

variantesRouter.post("/", requireRole("GERANT", "VENDEUR"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createVarianteSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.format() },
      422,
    );

  const { produitId, prixHT, tauxTVA, emballage, poids, sku, venteAuPoids } =
    parsed.data;
  const produit = await prisma.produit.findUnique({ where: { id: produitId } });
  if (!produit) return c.json({ error: "Produit introuvable" }, 404);

  const prixTTC = calcPrixTTC(prixHT, tauxTVA);
  const variante = await prisma.varianteProduit.create({
    data: {
      produitId,
      prixHT,
      tauxTVA,
      prixTTC,
      emballage: (emballage ?? "VRAC") as
        | "VRAC"
        | "BARQUETTE"
        | "FILET"
        | "SAC"
        | "CAISSE"
        | "PLATEAU",
      ...(poids != null && { poids }),
      ...(sku != null && { sku }),
      ...(venteAuPoids !== undefined && { venteAuPoids }),
    },
  });
  return c.json(variante, 201);
});

variantesRouter.get("/:id", async (c) => {
  const variante = await prisma.varianteProduit.findUnique({
    where: { id: c.req.param("id") },
  });
  if (!variante) return c.json({ error: "Variante introuvable" }, 404);
  return c.json(variante);
});

variantesRouter.put("/:id", requireRole("GERANT", "VENDEUR"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = updateVarianteSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.format() },
      422,
    );

  const existing = await prisma.varianteProduit.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "Variante introuvable" }, 404);

  const prixHT =
    parsed.data.prixHT !== undefined
      ? parsed.data.prixHT
      : Number(existing.prixHT);
  const tauxTVA =
    parsed.data.tauxTVA !== undefined
      ? parsed.data.tauxTVA
      : Number(existing.tauxTVA);
  const prixTTC = calcPrixTTC(prixHT, tauxTVA);

  const variante = await prisma.varianteProduit.update({
    where: { id },
    data: {
      prixHT,
      tauxTVA,
      prixTTC,
      ...(parsed.data.emballage !== undefined && {
        emballage: parsed.data.emballage,
      }),
      ...(parsed.data.poids !== undefined && { poids: parsed.data.poids }),
      ...(parsed.data.sku !== undefined && { sku: parsed.data.sku }),
      ...(parsed.data.venteAuPoids !== undefined && {
        venteAuPoids: parsed.data.venteAuPoids,
      }),
      ...(parsed.data.stockMin !== undefined && {
        stockMin: parsed.data.stockMin,
      }),
    },
  });
  return c.json(variante);
});

variantesRouter.patch("/bulk-prix", requireRole("GERANT"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.array(
    z.object({ id: z.string().min(1), prixHT: z.number().min(0) }),
  );
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  const updates = await Promise.all(
    parsed.data.map(async ({ id, prixHT }) => {
      const existing = await prisma.varianteProduit.findUnique({
        where: { id },
      });
      if (!existing) return null;
      const prixTTC = calcPrixTTC(prixHT, Number(existing.tauxTVA));
      return prisma.varianteProduit.update({
        where: { id },
        data: { prixHT, prixTTC },
        select: { id: true, prixHT: true, prixTTC: true },
      });
    }),
  );

  return c.json({ updated: updates.filter(Boolean).length });
});

const palierSchema = z.object({
  qteMin: z.number().min(0),
  remisePct: z.number().min(0.01).max(100),
});

// Replace all paliers for a variante (send full array)
variantesRouter.put("/:id/paliers", requireRole("GERANT"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = z.array(palierSchema).safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  const variante = await prisma.varianteProduit.findUnique({ where: { id } });
  if (!variante) return c.json({ error: "Variante introuvable" }, 404);

  await prisma.$transaction([
    prisma.palierRemise.deleteMany({ where: { varianteId: id } }),
    ...parsed.data.map((p) =>
      prisma.palierRemise.create({
        data: { varianteId: id!, qteMin: p.qteMin, remisePct: p.remisePct },
      }),
    ),
  ]);

  const paliers = await prisma.palierRemise.findMany({
    where: { varianteId: id },
    orderBy: { qteMin: "asc" },
  });
  return c.json(
    paliers.map((p) => ({
      id: p.id,
      qteMin: Number(p.qteMin),
      remisePct: Number(p.remisePct),
    })),
  );
});

variantesRouter.get("/:id/paliers", async (c) => {
  const id = c.req.param("id");
  const paliers = await prisma.palierRemise.findMany({
    where: { varianteId: id },
    orderBy: { qteMin: "asc" },
  });
  return c.json(
    paliers.map((p) => ({
      id: p.id,
      qteMin: Number(p.qteMin),
      remisePct: Number(p.remisePct),
    })),
  );
});

variantesRouter.patch("/:id/statut", requireRole("GERANT"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ actif: z.boolean() }).safeParse(body);
  if (!parsed.success) return c.json({ error: "Données invalides" }, 422);

  const existing = await prisma.varianteProduit.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "Variante introuvable" }, 404);

  const variante = await prisma.varianteProduit.update({
    where: { id },
    data: { actif: parsed.data.actif },
  });
  return c.json(variante);
});
