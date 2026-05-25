import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authMiddleware,
  requireRole,
  type HonoEnv,
} from "../lib/middleware.js";
import { logAudit } from "../lib/audit.js";

const createDemandeSchema = z.object({
  type: z.enum([
    "ACCES",
    "RECTIFICATION",
    "EFFACEMENT",
    "PORTABILITE",
    "OPPOSITION",
  ]),
  nom: z.string().min(1).max(200),
  email: z.string().email(),
  message: z.string().max(2000).optional(),
});

export const rgpdRouter = new Hono<HonoEnv>();

rgpdRouter.get("/demandes", requireRole("GERANT"), async (c) => {
  const demandes = await prisma.demandeRGPD.findMany({
    orderBy: { createdAt: "desc" },
  });
  return c.json(demandes);
});

rgpdRouter.post("/demandes", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createDemandeSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  const demande = await prisma.demandeRGPD.create({
    data: {
      type: parsed.data.type,
      nom: parsed.data.nom,
      email: parsed.data.email,
      message: parsed.data.message ?? null,
    },
  });
  await logAudit({
    action: "CREATE_DEMANDE_RGPD",
    entite: "DemandeRGPD",
    entiteId: demande.id,
    nouvelleValeur: { type: demande.type, email: demande.email },
  });
  return c.json(demande, 201);
});

rgpdRouter.patch("/demandes/:id", requireRole("GERANT"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = z
    .object({
      statut: z.enum(["EN_ATTENTE", "EN_COURS", "TRAITEE", "REFUSEE"]),
      reponse: z.string().max(2000).optional(),
    })
    .safeParse(body);
  if (!parsed.success) return c.json({ error: "Données invalides" }, 422);

  const existing = await prisma.demandeRGPD.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "Demande introuvable" }, 404);

  const demande = await prisma.demandeRGPD.update({
    where: { id },
    data: {
      statut: parsed.data.statut,
      reponse: parsed.data.reponse ?? null,
      traiteAt: parsed.data.statut === "TRAITEE" ? new Date() : null,
    },
  });
  await logAudit({
    userId: c.get("user").id,
    action: "PROCESS_DEMANDE_RGPD",
    entite: "DemandeRGPD",
    entiteId: id,
    nouvelleValeur: { statut: parsed.data.statut },
  });
  return c.json(demande);
});

rgpdRouter.get("/export/:userId", requireRole("GERANT"), async (c) => {
  const userId = c.req.param("userId");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      prenom: true,
      nom: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });
  if (!user) return c.json({ error: "Utilisateur introuvable" }, 404);

  const [ventes, audit] = await Promise.all([
    prisma.vente.findMany({
      where: { vendeurId: userId },
      select: {
        id: true,
        numeroTicket: true,
        date: true,
        totalTTC: true,
        statut: true,
      },
    }),
    prisma.journalAudit.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: 1000,
    }),
  ]);

  await logAudit({
    userId: c.get("user").id,
    action: "EXPORT_DONNEES_RGPD",
    entite: "User",
    entiteId: userId,
  });
  return c.json({
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    },
    ventes: ventes.map((v) => ({
      ...v,
      date: v.date.toISOString(),
      totalTTC: Number(v.totalTTC),
    })),
    audit,
  });
});
