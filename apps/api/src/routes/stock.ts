import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authMiddleware,
  requireRole,
  type HonoEnv,
} from "../lib/middleware.js";

export const stockRouter = new Hono<HonoEnv>();

stockRouter.use("*", authMiddleware);

// All active variantes with stock info
stockRouter.get("/", async (c) => {
  const variantes = await prisma.varianteProduit.findMany({
    where: { actif: true },
    include: {
      produit: {
        select: { id: true, nom: true, categorie: { select: { nom: true } } },
      },
    },
    orderBy: [{ produit: { nom: "asc" } }, { poids: "asc" }],
  });

  return c.json(
    variantes.map((v) => ({
      id: v.id,
      produitId: v.produitId,
      produitNom: v.produit.nom,
      categorieNom: v.produit.categorie?.nom ?? null,
      poids: v.poids != null ? Number(v.poids) : null,
      emballage: v.emballage,
      venteAuPoids: v.venteAuPoids,
      stockActuel: Number(v.stockActuel),
      stockMin: v.stockMin != null ? Number(v.stockMin) : null,
      sku: v.sku,
    })),
  );
});

// Variantes below min threshold (stockActuel <= stockMin, stockMin non-null)
stockRouter.get("/alerts", async (c) => {
  const variantes = await prisma.$queryRaw<
    Array<{
      id: string;
      produit_nom: string;
      vente_au_poids: boolean;
      stock_actuel: number;
      stock_min: number;
    }>
  >`
    SELECT v.id, p.nom AS produit_nom, v.vente_au_poids, v.stock_actuel, v.stock_min
    FROM variantes_produit v
    JOIN produits p ON p.id = v.produit_id
    WHERE v.actif = true
      AND v.stock_min IS NOT NULL
      AND v.stock_actuel <= v.stock_min
    ORDER BY v.stock_actuel ASC
  `;

  return c.json(
    variantes.map((v) => ({
      id: v.id,
      produitNom: v.produit_nom,
      venteAuPoids: v.vente_au_poids,
      stockActuel: Number(v.stock_actuel),
      stockMin: Number(v.stock_min),
    })),
  );
});

const ajustementSchema = z.object({
  type: z.enum(["ENTREE", "SORTIE", "AJUSTEMENT"]),
  quantite: z.number().positive(),
  motif: z.string().optional(),
  stockMin: z.number().min(0).optional().nullable(),
});

// Manual stock adjustment
stockRouter.patch("/:varianteId", requireRole("GERANT"), async (c) => {
  const varianteId = c.req.param("varianteId");
  const body = await c.req.json().catch(() => null);
  const parsed = ajustementSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  const variante = await prisma.varianteProduit.findUnique({
    where: { id: varianteId },
  });
  if (!variante) return c.json({ error: "Variante introuvable" }, 404);

  const { type, quantite, motif, stockMin } = parsed.data;
  const current = Number(variante.stockActuel);

  let newStock: number;
  if (type === "ENTREE")
    newStock = Math.round((current + quantite) * 1000) / 1000;
  else if (type === "SORTIE")
    newStock = Math.round((current - quantite) * 1000) / 1000;
  else newStock = Math.round(quantite * 1000) / 1000; // AJUSTEMENT = set directly

  const userId = c.get("user").id;

  await prisma.$transaction([
    prisma.varianteProduit.update({
      where: { id: varianteId },
      data: {
        stockActuel: newStock,
        ...(stockMin !== undefined && { stockMin: stockMin ?? null }),
      },
    }),
    prisma.mouvementStock.create({
      data: {
        varianteId: varianteId as string,
        type,
        quantite,
        motif: motif ?? null,
        userId,
      },
    }),
  ]);

  const updated = await prisma.varianteProduit.findUnique({
    where: { id: varianteId },
  });
  return c.json({
    stockActuel: Number(updated!.stockActuel),
    stockMin: updated!.stockMin != null ? Number(updated!.stockMin) : null,
  });
});

// Movement history for a variante
stockRouter.get("/:varianteId/mouvements", async (c) => {
  const varianteId = c.req.param("varianteId");
  const mouvements = await prisma.mouvementStock.findMany({
    where: { varianteId },
    include: { user: { select: { prenom: true, nom: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return c.json(mouvements);
});
