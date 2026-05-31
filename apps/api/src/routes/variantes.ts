import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authMiddleware,
  requireRole,
  type HonoEnv,
} from "../lib/middleware.js";
import { calcPrixTTC } from "../lib/tva.js";

// Sélecteur réutilisable — inclut tauxTVA pour calculer prixTTC à la volée
const varianteInclude = {
  tauxTVA: { select: { id: true, libelle: true, taux: true } },
  unitePoids: { select: { id: true, symbole: true, libelle: true } },
} as const;

// prixTTC n'est plus stocké (N3) : on le calcule à la sérialisation
function serializeVariante(v: {
  prixHT: string | number | { toString(): string };
  tauxTVA: { id: string; libelle: string; taux: string | number | { toString(): string } };
  [key: string]: unknown;
}) {
  const prixHT = Number(v.prixHT);
  const taux = Number(v.tauxTVA.taux);
  return { ...v, prixTTC: calcPrixTTC(prixHT, taux) };
}

const createVarianteSchema = z.object({
  produitId:    z.string().min(1),
  prixHT:       z.number().min(0),
  tauxTVAId:    z.string().min(1),
  emballage:    z.enum(["VRAC", "BARQUETTE", "FILET", "SAC", "CAISSE", "PLATEAU"]).optional(),
  poids:        z.number().min(0).optional().nullable(),
  unitePoidsId: z.string().optional().nullable(),
  sku:          z.string().optional().nullable(),
  venteAuPoids: z.boolean().optional(),
});

const updateVarianteSchema = z.object({
  prixHT:       z.number().min(0).optional(),
  tauxTVAId:    z.string().min(1).optional(),
  emballage:    z.enum(["VRAC", "BARQUETTE", "FILET", "SAC", "CAISSE", "PLATEAU"]).optional(),
  poids:        z.number().min(0).optional().nullable(),
  unitePoidsId: z.string().optional().nullable(),
  sku:          z.string().optional().nullable(),
  venteAuPoids: z.boolean().optional(),
  stockMin:     z.number().min(0).optional().nullable(),
});

export const variantesRouter = new Hono<HonoEnv>();

variantesRouter.use("*", authMiddleware);

variantesRouter.get("/", async (c) => {
  const produitId = c.req.query("produitId") ?? undefined;
  const variantes = await prisma.varianteProduit.findMany({
    where: produitId ? { produitId } : {},
    include: varianteInclude,
    orderBy: { poids: "asc" },
  });
  return c.json(variantes.map(serializeVariante));
});

variantesRouter.post("/", requireRole("GERANT", "VENDEUR"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createVarianteSchema.safeParse(body);
  if (!parsed.success)
    return c.json({ error: "Données invalides", details: parsed.error.format() }, 422);

  const { produitId, prixHT, tauxTVAId, emballage, poids, unitePoidsId, sku, venteAuPoids } =
    parsed.data;

  const [produit, tauxTVA] = await Promise.all([
    prisma.produit.findUnique({ where: { id: produitId } }),
    prisma.tauxTVA.findUnique({ where: { id: tauxTVAId } }),
  ]);
  if (!produit)  return c.json({ error: "Produit introuvable" }, 404);
  if (!tauxTVA)  return c.json({ error: "Taux TVA introuvable" }, 404);

  const variante = await prisma.varianteProduit.create({
    data: {
      produitId,
      prixHT,
      tauxTVAId,
      emballage: (emballage ?? "VRAC") as "VRAC" | "BARQUETTE" | "FILET" | "SAC" | "CAISSE" | "PLATEAU",
      ...(poids != null         && { poids }),
      ...(unitePoidsId != null  && { unitePoidsId }),
      ...(sku != null           && { sku }),
      ...(venteAuPoids !== undefined && { venteAuPoids }),
    },
    include: varianteInclude,
  });
  return c.json(serializeVariante(variante), 201);
});

variantesRouter.get("/:id", async (c) => {
  const variante = await prisma.varianteProduit.findUnique({
    where: { id: c.req.param("id") },
    include: varianteInclude,
  });
  if (!variante) return c.json({ error: "Variante introuvable" }, 404);
  return c.json(serializeVariante(variante));
});

variantesRouter.put("/:id", requireRole("GERANT", "VENDEUR"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = updateVarianteSchema.safeParse(body);
  if (!parsed.success)
    return c.json({ error: "Données invalides", details: parsed.error.format() }, 422);

  const existing = await prisma.varianteProduit.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "Variante introuvable" }, 404);

  if (parsed.data.tauxTVAId) {
    const tva = await prisma.tauxTVA.findUnique({ where: { id: parsed.data.tauxTVAId } });
    if (!tva) return c.json({ error: "Taux TVA introuvable" }, 404);
  }

  const variante = await prisma.varianteProduit.update({
    where: { id },
    data: {
      ...(parsed.data.prixHT       !== undefined && { prixHT: parsed.data.prixHT }),
      ...(parsed.data.tauxTVAId    !== undefined && { tauxTVAId: parsed.data.tauxTVAId }),
      ...(parsed.data.emballage    !== undefined && { emballage: parsed.data.emballage }),
      ...(parsed.data.poids        !== undefined && { poids: parsed.data.poids }),
      ...(parsed.data.unitePoidsId !== undefined && { unitePoidsId: parsed.data.unitePoidsId }),
      ...(parsed.data.sku          !== undefined && { sku: parsed.data.sku }),
      ...(parsed.data.venteAuPoids !== undefined && { venteAuPoids: parsed.data.venteAuPoids }),
      ...(parsed.data.stockMin     !== undefined && { stockMin: parsed.data.stockMin }),
    },
    include: varianteInclude,
  });
  return c.json(serializeVariante(variante));
});

variantesRouter.patch("/bulk-prix", requireRole("GERANT"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.array(z.object({ id: z.string().min(1), prixHT: z.number().min(0) }));
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return c.json({ error: "Données invalides", details: parsed.error.flatten() }, 422);

  const updates = await Promise.all(
    parsed.data.map(async ({ id, prixHT }) => {
      const v = await prisma.varianteProduit.findUnique({
        where: { id },
        include: { tauxTVA: { select: { taux: true } } },
      });
      if (!v) return null;
      const updated = await prisma.varianteProduit.update({
        where: { id },
        data: { prixHT },
        include: { tauxTVA: { select: { id: true, libelle: true, taux: true } } },
      });
      return {
        id: updated.id,
        prixHT: Number(updated.prixHT),
        prixTTC: calcPrixTTC(Number(updated.prixHT), Number(updated.tauxTVA.taux)),
      };
    }),
  );

  return c.json({ updated: updates.filter(Boolean).length });
});

const palierSchema = z.object({
  qteMin:    z.number().min(0),
  remisePct: z.number().min(0.01).max(100),
});

variantesRouter.put("/:id/paliers", requireRole("GERANT"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = z.array(palierSchema).safeParse(body);
  if (!parsed.success)
    return c.json({ error: "Données invalides", details: parsed.error.flatten() }, 422);

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
  return c.json(paliers.map((p) => ({
    id: p.id,
    qteMin: Number(p.qteMin),
    remisePct: Number(p.remisePct),
  })));
});

variantesRouter.get("/:id/paliers", async (c) => {
  const id = c.req.param("id");
  const paliers = await prisma.palierRemise.findMany({
    where: { varianteId: id },
    orderBy: { qteMin: "asc" },
  });
  return c.json(paliers.map((p) => ({
    id: p.id,
    qteMin: Number(p.qteMin),
    remisePct: Number(p.remisePct),
  })));
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
    include: varianteInclude,
  });
  return c.json(serializeVariante(variante));
});
