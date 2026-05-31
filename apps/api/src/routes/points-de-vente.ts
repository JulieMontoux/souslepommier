import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authMiddleware,
  requireRole,
  type HonoEnv,
} from "../lib/middleware.js";

export const pointsDeVenteRouter = new Hono<HonoEnv>();

pointsDeVenteRouter.use("*", authMiddleware);

const pdvSchema = z.object({
  nom: z.string().min(1).max(100),
  actif: z.boolean().optional(),
});

// GET /points-de-vente — all roles (needed for POS selector)
pointsDeVenteRouter.get("/", async (c) => {
  const actif = c.req.query("actif");
  const pdvs = await prisma.pointDeVente.findMany({
    where: actif !== undefined ? { actif: actif === "true" } : undefined,
    orderBy: { nom: "asc" },
  });
  return c.json(pdvs);
});

// POST /points-de-vente
pointsDeVenteRouter.post("/", requireRole("GERANT"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = pdvSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  const pdv = await prisma.pointDeVente.create({
    data: { nom: parsed.data.nom },
  });
  return c.json(pdv, 201);
});

// PUT /points-de-vente/:id
pointsDeVenteRouter.put("/:id", requireRole("GERANT"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = pdvSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  const existing = await prisma.pointDeVente.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "Point de vente introuvable" }, 404);

  const pdv = await prisma.pointDeVente.update({
    where: { id },
    data: {
      nom: parsed.data.nom,
      ...(parsed.data.actif !== undefined && { actif: parsed.data.actif }),
    },
  });
  return c.json(pdv);
});
