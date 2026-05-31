import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authMiddleware,
  requireRole,
  type HonoEnv,
} from "../lib/middleware.js";
import { logAudit } from "../lib/audit.js";

function luhnSiret(siret: string): boolean {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let n = parseInt(siret[i]);
    if (i % 2 === 0) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

const clientCreateSchema = z.object({
  raisonSociale: z.string().min(1).max(200),
  siret: z
    .string()
    .regex(/^\d{14}$/)
    .refine(luhnSiret, "SIRET invalide")
    .optional()
    .nullable(),
  tvaIntracommunautaire: z
    .string()
    .regex(/^FR\d{11}$/)
    .optional()
    .nullable(),
  adresse: z.string().max(200).optional().nullable(),
  codePostal: z
    .string()
    .regex(/^\d{5}$/)
    .optional()
    .nullable(),
  ville: z.string().max(100).optional().nullable(),
  pays: z.string().length(2).default("FR"),
  email: z.string().email().optional().nullable(),
  telephone: z.string().max(20).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  conditionsPaiement: z.number().int().min(0).default(30),
  formeJuridique: z.string().max(50).optional().nullable(),
});

const clientUpdateSchema = clientCreateSchema.partial().extend({
  raisonSociale: z.string().min(1).max(200),
});

export const clientsRouter = new Hono<HonoEnv>();

clientsRouter.use("*", authMiddleware);

clientsRouter.get("/", async (c) => {
  const q = c.req.query("q")?.trim() || undefined;
  const actifParam = c.req.query("actif");
  const actif =
    actifParam === "false" ? false : actifParam === "true" ? true : undefined;

  const clients = await prisma.client.findMany({
    where: {
      ...(q && {
        OR: [
          { raisonSociale: { contains: q, mode: "insensitive" } },
          { siret: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      }),
      ...(actif !== undefined && { actif }),
    },
    orderBy: { raisonSociale: "asc" },
  });
  return c.json(clients);
});

clientsRouter.post("/", requireRole("GERANT"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = clientCreateSchema.safeParse(body);
  if (!parsed.success)
    return c.json({ error: parsed.error.flatten().fieldErrors }, 422);

  if (parsed.data.siret) {
    const conflict = await prisma.client.findUnique({
      where: { siret: parsed.data.siret },
    });
    if (conflict)
      return c.json({ error: "Un client avec ce SIRET existe déjà" }, 409);
  }

  const client = await prisma.client.create({ data: parsed.data });
  await logAudit({
    userId: c.get("user").id,
    action: "CREATE",
    entite: "Client",
    entiteId: client.id,
    nouvelleValeur: { raisonSociale: client.raisonSociale },
  });
  return c.json(client, 201);
});

clientsRouter.get("/:id", async (c) => {
  const client = await prisma.client.findUnique({
    where: { id: c.req.param("id") },
  });
  if (!client) return c.json({ error: "Client introuvable" }, 404);
  return c.json(client);
});

clientsRouter.put("/:id", requireRole("GERANT"), async (c) => {
  const id = c.req.param("id");
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "Client introuvable" }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = clientUpdateSchema.safeParse(body);
  if (!parsed.success)
    return c.json({ error: parsed.error.flatten().fieldErrors }, 422);

  if (parsed.data.siret && parsed.data.siret !== existing.siret) {
    const conflict = await prisma.client.findUnique({
      where: { siret: parsed.data.siret },
    });
    if (conflict)
      return c.json({ error: "Un client avec ce SIRET existe déjà" }, 409);
  }

  const updated = await prisma.client.update({
    where: { id },
    data: parsed.data,
  });
  await logAudit({
    userId: c.get("user").id,
    action: "UPDATE",
    entite: "Client",
    entiteId: id,
    ancienneValeur: existing as Record<string, unknown>,
    nouvelleValeur: parsed.data as Record<string, unknown>,
  });
  return c.json(updated);
});

clientsRouter.get("/:id/factures", async (c) => {
  const factures = await prisma.facture.findMany({
    where: { clientId: c.req.param("id") },
    orderBy: { dateEmission: "desc" },
  });
  return c.json(factures);
});
