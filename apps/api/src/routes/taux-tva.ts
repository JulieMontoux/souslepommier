import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authMiddleware,
  requireRole,
  type HonoEnv,
} from "../lib/middleware.js";
import { logAudit } from "../lib/audit.js";

const tauxSchema = z.object({
  libelle: z.string().min(1).max(100),
  taux: z.number().min(0).max(100),
  defaut: z.boolean().default(false),
  dateEffet: z.string().optional(),
});

export const tauxTvaRouter = new Hono<HonoEnv>();

tauxTvaRouter.use("*", authMiddleware);

tauxTvaRouter.get("/", async (c) => {
  const rows = await prisma.tauxTVA.findMany({
    orderBy: [{ actif: "desc" }, { taux: "asc" }],
  });
  return c.json(rows.map((t) => ({ ...t, taux: Number(t.taux) })));
});

tauxTvaRouter.post("/", requireRole("GERANT"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = tauxSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  const data = parsed.data;
  if (data.defaut) await prisma.tauxTVA.updateMany({ data: { defaut: false } });

  const tva = await prisma.tauxTVA.create({
    data: {
      libelle: data.libelle,
      taux: data.taux,
      defaut: data.defaut,
      dateEffet: data.dateEffet ? new Date(data.dateEffet) : new Date(),
    },
  });
  await logAudit({
    userId: c.get("user").id,
    action: "CREATE_TAUX_TVA",
    entite: "TauxTVA",
    entiteId: tva.id,
    nouvelleValeur: { libelle: tva.libelle, taux: Number(tva.taux) },
  });
  return c.json({ ...tva, taux: Number(tva.taux) }, 201);
});

tauxTvaRouter.put("/:id", requireRole("GERANT"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = tauxSchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ error: "Données invalides" }, 422);

  const existing = await prisma.tauxTVA.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "Taux introuvable" }, 404);

  if (parsed.data.defaut)
    await prisma.tauxTVA.updateMany({
      where: { NOT: { id } },
      data: { defaut: false },
    });

  const tva = await prisma.tauxTVA.update({ where: { id }, data: parsed.data });
  await logAudit({
    userId: c.get("user").id,
    action: "UPDATE_TAUX_TVA",
    entite: "TauxTVA",
    entiteId: id,
    nouvelleValeur: parsed.data as Record<string, unknown>,
  });
  return c.json({ ...tva, taux: Number(tva.taux) });
});

tauxTvaRouter.patch("/:id/toggle", requireRole("GERANT"), async (c) => {
  const id = c.req.param("id");
  const existing = await prisma.tauxTVA.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "Taux introuvable" }, 404);

  const tva = await prisma.tauxTVA.update({
    where: { id },
    data: { actif: !existing.actif },
  });
  await logAudit({
    userId: c.get("user").id,
    action: "TOGGLE_TAUX_TVA",
    entite: "TauxTVA",
    entiteId: id,
    nouvelleValeur: { actif: tva.actif },
  });
  return c.json({ ...tva, taux: Number(tva.taux) });
});
