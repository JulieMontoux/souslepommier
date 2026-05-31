import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authMiddleware,
  requireRole,
  type HonoEnv,
} from "../lib/middleware.js";

const categorieSchema = z.object({ nom: z.string().min(1).max(100) });

export const categoriesRouter = new Hono<HonoEnv>();

categoriesRouter.use("*", authMiddleware);

categoriesRouter.get("/", async (c) => {
  const categories = await prisma.categorie.findMany({
    orderBy: { nom: "asc" },
  });
  return c.json(categories);
});

categoriesRouter.post("/", requireRole("GERANT"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = categorieSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  const categorie = await prisma.categorie.upsert({
    where: { nom: parsed.data.nom },
    update: {},
    create: { nom: parsed.data.nom },
  });
  return c.json(categorie, 201);
});
