import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authMiddleware,
  requireRole,
  type HonoEnv,
} from "../lib/middleware.js";
import { logAudit } from "../lib/audit.js";

const CONFIG_ID = "default";

const configSchema = z.object({
  raisonSociale: z.string().min(1).max(200),
  formeJuridique: z.string().optional().nullable(),
  capitalSocial: z.number().positive().optional().nullable(),
  siret: z.string().optional().nullable(),
  tvaIntracommunautaire: z.string().optional().nullable(),
  adresse: z.string().optional().nullable(),
  codePostal: z.string().optional().nullable(),
  ville: z.string().optional().nullable(),
  pays: z.string().default("FR"),
  telephone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  iban: z.string().optional().nullable(),
  rcs: z.string().optional().nullable(),
  villeRCS: z.string().optional().nullable(),
  codeAPE: z.string().optional().nullable(),
  regimeTVA: z.string().default("NORMAL"),
  responsableRGPD: z.string().optional().nullable(),
  emailRGPD: z.string().email().optional().nullable(),
});

export const configRouter = new Hono<HonoEnv>();

configRouter.use("*", authMiddleware);

configRouter.get("/", async (c) => {
  const config = await prisma.configEntreprise.findUnique({
    where: { id: CONFIG_ID },
  });
  return c.json(config ?? {});
});

configRouter.put("/", requireRole("GERANT"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = configSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  const data = parsed.data;
  const existing = await prisma.configEntreprise.findUnique({
    where: { id: CONFIG_ID },
  });

  const config = await prisma.configEntreprise.upsert({
    where: { id: CONFIG_ID },
    update: {
      ...data,
      capitalSocial: data.capitalSocial ?? null,
      siret: data.siret || null,
      tvaIntracommunautaire: data.tvaIntracommunautaire || null,
      adresse: data.adresse || null,
      codePostal: data.codePostal || null,
      ville: data.ville || null,
      telephone: data.telephone || null,
      email: data.email || null,
      iban: data.iban || null,
      rcs: data.rcs || null,
      villeRCS: data.villeRCS || null,
      codeAPE: data.codeAPE || null,
      responsableRGPD: data.responsableRGPD || null,
      emailRGPD: data.emailRGPD || null,
    },
    create: {
      id: CONFIG_ID,
      ...data,
      formeJuridique: data.formeJuridique || null,
      capitalSocial: data.capitalSocial ?? null,
      siret: data.siret || null,
      tvaIntracommunautaire: data.tvaIntracommunautaire || null,
      adresse: data.adresse || null,
      codePostal: data.codePostal || null,
      ville: data.ville || null,
      telephone: data.telephone || null,
      email: data.email || null,
      iban: data.iban || null,
      rcs: data.rcs || null,
      villeRCS: data.villeRCS || null,
      codeAPE: data.codeAPE || null,
      responsableRGPD: data.responsableRGPD || null,
      emailRGPD: data.emailRGPD || null,
    },
  });

  await logAudit({
    userId: c.get("user").id,
    action: existing ? "UPDATE" : "CREATE",
    entite: "ConfigEntreprise",
    entiteId: CONFIG_ID,
    ancienneValeur: existing as Record<string, unknown>,
    nouvelleValeur: config as Record<string, unknown>,
  });
  return c.json(config);
});
