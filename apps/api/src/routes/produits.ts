import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authMiddleware,
  requireRole,
  type HonoEnv,
} from "../lib/middleware.js";
import { logAudit } from "../lib/audit.js";
import { calcPrixTTC } from "../lib/tva.js";

const produitSchema = z.object({
  nom: z.string().min(1).max(100),
  categorieId: z.string().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  image: z.string().url().optional().nullable(),
  actif: z.boolean().default(true),
});

const createVarianteSchema = z.object({
  produitId: z.string().min(1),
  prixHT: z.number().min(0),
  tauxTVA: z.number().min(0),
  emballage: z
    .enum(["VRAC", "BARQUETTE", "FILET", "SAC", "CAISSE", "PLATEAU"])
    .optional(),
  poids: z.number().min(0).optional().nullable(),
  sku: z.string().optional().nullable(),
});

export const produitsRouter = new Hono<HonoEnv>();

produitsRouter.use("*", authMiddleware);

produitsRouter.get("/", async (c) => {
  const search = c.req.query("search") ?? c.req.query("q") ?? undefined;
  const categorieId = c.req.query("categorieId") ?? undefined;
  const actifParam = c.req.query("actif");
  const actif =
    actifParam === "true" ? true : actifParam === "false" ? false : undefined;

  const produits = await prisma.produit.findMany({
    where: {
      ...(search && { nom: { contains: search, mode: "insensitive" } }),
      ...(categorieId && { categorieId }),
      ...(actif !== undefined && { actif }),
    },
    include: {
      categorie: { select: { id: true, nom: true } },
      variantes: {
        where: actif !== undefined ? { actif } : undefined,
        orderBy: { poids: "asc" },
      },
    },
    orderBy: { nom: "asc" },
  });
  return c.json(produits);
});

produitsRouter.post("/", requireRole("GERANT"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = produitSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  const user = c.get("user");
  const produit = await prisma.produit.create({
    data: {
      nom: parsed.data.nom,
      ...(parsed.data.categorieId && { categorieId: parsed.data.categorieId }),
      ...(parsed.data.description !== undefined && {
        description: parsed.data.description,
      }),
      ...(parsed.data.image !== undefined && { image: parsed.data.image }),
    },
    include: { categorie: true, variantes: true },
  });
  await logAudit({
    userId: user.id,
    action: "CREATE",
    entite: "Produit",
    entiteId: produit.id,
    nouvelleValeur: parsed.data as Record<string, unknown>,
  });
  return c.json(produit, 201);
});

produitsRouter.get("/:id", async (c) => {
  const produit = await prisma.produit.findUnique({
    where: { id: c.req.param("id") },
    include: { categorie: true, variantes: { orderBy: { poids: "asc" } } },
  });
  if (!produit) return c.json({ error: "Produit introuvable" }, 404);
  return c.json(produit);
});

produitsRouter.put("/:id", requireRole("GERANT"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = produitSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  const existing = await prisma.produit.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "Produit introuvable" }, 404);

  const produit = await prisma.produit.update({
    where: { id },
    data: {
      nom: parsed.data.nom,
      categorieId: parsed.data.categorieId ?? null,
      description: parsed.data.description ?? null,
      image: parsed.data.image ?? null,
      actif: parsed.data.actif,
    },
    include: { categorie: true, variantes: true },
  });
  await logAudit({
    userId: c.get("user").id,
    action: "UPDATE",
    entite: "Produit",
    entiteId: id,
    ancienneValeur: existing as Record<string, unknown>,
    nouvelleValeur: parsed.data as Record<string, unknown>,
  });
  return c.json(produit);
});

produitsRouter.patch("/:id/statut", requireRole("GERANT"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  if (typeof body?.actif !== "boolean")
    return c.json({ error: "Champ actif (boolean) requis" }, 422);
  const { actif } = body;

  const existing = await prisma.produit.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "Produit introuvable" }, 404);

  const [produit] = await prisma.$transaction([
    prisma.produit.update({ where: { id }, data: { actif } }),
    ...(actif === false
      ? [
          prisma.varianteProduit.updateMany({
            where: { produitId: id },
            data: { actif: false },
          }),
        ]
      : []),
  ]);
  await logAudit({
    userId: c.get("user").id,
    action: actif ? "ACTIVATE" : "DEACTIVATE",
    entite: "Produit",
    entiteId: id,
    ancienneValeur: { actif: existing.actif },
    nouvelleValeur: { actif },
  });
  return c.json(produit);
});

produitsRouter.get("/:id/variantes", async (c) => {
  const variantes = await prisma.varianteProduit.findMany({
    where: { produitId: c.req.param("id") },
    orderBy: { poids: "asc" },
  });
  return c.json(variantes);
});
