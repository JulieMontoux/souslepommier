import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authMiddleware,
  requireRole,
  type HonoEnv,
} from "../lib/middleware.js";
import { logAudit } from "../lib/audit.js";
import { sendTestEmail } from "../lib/email.js";

const CONFIG_ID = "default";

const emptyToNull = z.preprocess((v) => (v === "" ? null : v), z.string().nullable().optional());
const emailOrNull = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().email().nullable().optional()
);
const portOrNull = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number().int().min(1).max(65535).nullable().optional()
);
const capitalOrNull = z.preprocess(
  (v) => (v === "" || v === null || v === undefined || (typeof v === "number" && isNaN(v)) ? null : Number(v)),
  z.number().positive().nullable().optional()
);

const configSchema = z.object({
  raisonSociale: z.string().min(1).max(200),
  formeJuridique: emptyToNull,
  capitalSocial: capitalOrNull,
  siret: emptyToNull,
  tvaIntracommunautaire: emptyToNull,
  adresse: emptyToNull,
  codePostal: emptyToNull,
  ville: emptyToNull,
  pays: z.string().default("FR"),
  telephone: emptyToNull,
  email: emailOrNull,
  iban: emptyToNull,
  rcs: emptyToNull,
  villeRCS: emptyToNull,
  codeAPE: emptyToNull,
  regimeTVA: z.string().default("NORMAL"),
  responsableRGPD: emptyToNull,
  emailRGPD: emailOrNull,
  smtpHost: emptyToNull,
  smtpPort: portOrNull,
  smtpUser: emptyToNull,
  smtpPass: emptyToNull,
  smtpFrom: emptyToNull,
  smtpTls: z.boolean().default(true),
});

export const configRouter = new Hono<HonoEnv>();

configRouter.use("*", authMiddleware);

configRouter.get("/", async (c) => {
  const config = await prisma.configEntreprise.findUnique({
    where: { id: CONFIG_ID },
  });
  if (!config) return c.json({});
  // Never expose SMTP password — replace with boolean flag
  const { smtpPass, ...rest } = config;
  return c.json({ ...rest, smtpPassSet: !!smtpPass });
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
      smtpHost: data.smtpHost || null,
      smtpPort: data.smtpPort ?? null,
      smtpUser: data.smtpUser || null,
      // Only update password if a new value was provided
      ...(data.smtpPass ? { smtpPass: data.smtpPass } : {}),
      smtpFrom: data.smtpFrom || null,
      smtpTls: data.smtpTls,
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
      smtpHost: data.smtpHost || null,
      smtpPort: data.smtpPort ?? null,
      smtpUser: data.smtpUser || null,
      smtpPass: data.smtpPass || null,
      smtpFrom: data.smtpFrom || null,
      smtpTls: data.smtpTls,
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
  const { smtpPass: _pass, ...configSafe } = config;
  return c.json({ ...configSafe, smtpPassSet: !!_pass });
});

configRouter.post("/smtp-test", requireRole("GERANT"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const email = body?.email as string | undefined;
  if (!email) return c.json({ error: "Email destinataire requis" }, 422);

  try {
    await sendTestEmail(email);
    return c.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return c.json({ error: `Échec envoi : ${message}` }, 500);
  }
});
