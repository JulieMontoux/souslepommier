import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authMiddleware,
  requireRole,
  type HonoEnv,
} from "../lib/middleware.js";
import { logAudit } from "../lib/audit.js";
import { createVente } from "../lib/create-vente.js";

export const abonnementsRouter = new Hono<HonoEnv>();

abonnementsRouter.use("*", authMiddleware);

const abonnementSchema = z.object({
  clientId: z.string().min(1),
  nom: z.string().min(1),
  frequence: z.enum(["HEBDO", "BIMENSUEL", "MENSUEL"]),
  lignes: z
    .array(
      z.object({
        varianteProduitId: z.string().min(1),
        qte: z.number().positive(),
      }),
    )
    .min(1),
});

// GET /abonnements
abonnementsRouter.get("/", requireRole("GERANT"), async (c) => {
  const clientId = c.req.query("clientId");
  const actif = c.req.query("actif");

  const abonnements = await prisma.abonnement.findMany({
    where: {
      ...(clientId && { clientId }),
      ...(actif !== undefined && { actif: actif === "true" }),
    },
    include: {
      client: { select: { id: true, raisonSociale: true } },
      lignes: {
        include: {
          variante: {
            include: { produit: { select: { id: true, nom: true } } },
          },
        },
      },
      _count: { select: { livraisons: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return c.json(abonnements);
});

// GET /abonnements/:id
abonnementsRouter.get("/:id", requireRole("GERANT"), async (c) => {
  const abonnement = await prisma.abonnement.findUnique({
    where: { id: c.req.param("id") },
    include: {
      client: { select: { id: true, raisonSociale: true } },
      lignes: {
        include: {
          variante: {
            include: { produit: { select: { id: true, nom: true } } },
          },
        },
      },
      livraisons: {
        orderBy: { date: "desc" },
        take: 20,
        include: {
          vente: { select: { id: true, numeroTicket: true, totalTTC: true } },
        },
      },
    },
  });
  if (!abonnement) return c.json({ error: "Abonnement introuvable" }, 404);
  return c.json(abonnement);
});

// POST /abonnements
abonnementsRouter.post("/", requireRole("GERANT"), async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = abonnementSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  const abonnement = await prisma.abonnement.create({
    data: {
      clientId: parsed.data.clientId,
      nom: parsed.data.nom,
      frequence: parsed.data.frequence,
      lignes: {
        create: parsed.data.lignes.map((l) => ({
          varianteProduitId: l.varianteProduitId,
          qte: l.qte,
        })),
      },
    },
    include: {
      client: { select: { id: true, raisonSociale: true } },
      lignes: true,
    },
  });

  await logAudit({
    userId: user.id,
    action: "CREATE_ABONNEMENT",
    entite: "Abonnement",
    entiteId: abonnement.id,
    nouvelleValeur: { nom: abonnement.nom, clientId: abonnement.clientId },
  });
  return c.json(abonnement, 201);
});

// PUT /abonnements/:id
abonnementsRouter.put("/:id", requireRole("GERANT"), async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = abonnementSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  const existing = await prisma.abonnement.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "Abonnement introuvable" }, 404);

  const abonnement = await prisma.$transaction(async (tx) => {
    await tx.ligneAbonnement.deleteMany({ where: { abonnementId: id } });
    return tx.abonnement.update({
      where: { id },
      data: {
        clientId: parsed.data.clientId,
        nom: parsed.data.nom,
        frequence: parsed.data.frequence,
        lignes: {
          create: parsed.data.lignes.map((l) => ({
            varianteProduitId: l.varianteProduitId,
            qte: l.qte,
          })),
        },
      },
      include: {
        client: { select: { id: true, raisonSociale: true } },
        lignes: true,
      },
    });
  });

  await logAudit({
    userId: user.id,
    action: "UPDATE_ABONNEMENT",
    entite: "Abonnement",
    entiteId: id,
    nouvelleValeur: { nom: abonnement.nom },
  });
  return c.json(abonnement);
});

// PATCH /abonnements/:id/actif
abonnementsRouter.patch("/:id/actif", requireRole("GERANT"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ actif: z.boolean() }).safeParse(body);
  if (!parsed.success) return c.json({ error: "Données invalides" }, 422);

  const existing = await prisma.abonnement.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "Abonnement introuvable" }, 404);

  const abonnement = await prisma.abonnement.update({
    where: { id },
    data: { actif: parsed.data.actif },
  });
  return c.json(abonnement);
});

// GET /abonnements/:id/livraisons
abonnementsRouter.get("/:id/livraisons", requireRole("GERANT"), async (c) => {
  const id = c.req.param("id");
  const livraisons = await prisma.livraison.findMany({
    where: { abonnementId: id },
    orderBy: { date: "desc" },
    include: {
      vente: { select: { id: true, numeroTicket: true, totalTTC: true } },
    },
  });
  return c.json(livraisons);
});

// GET /abonnements/livraisons/calendrier — upcoming livraisons (next 60 days)
abonnementsRouter.get(
  "/livraisons/calendrier",
  requireRole("GERANT"),
  async (c) => {
    const now = new Date();
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + 60);

    const livraisons = await prisma.livraison.findMany({
      where: {
        date: { gte: now, lte: horizon },
        statut: "PLANIFIEE",
      },
      orderBy: { date: "asc" },
      include: {
        abonnement: {
          include: {
            client: { select: { id: true, raisonSociale: true } },
          },
        },
      },
    });
    return c.json(livraisons);
  },
);

// POST /abonnements/:id/livraisons — plan a livraison
const livraisonPlanSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD requis"),
});

abonnementsRouter.post("/:id/livraisons", requireRole("GERANT"), async (c) => {
  const user = c.get("user");
  const abonnementId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = livraisonPlanSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  const abonnement = await prisma.abonnement.findUnique({
    where: { id: abonnementId },
    include: { lignes: true },
  });
  if (!abonnement) return c.json({ error: "Abonnement introuvable" }, 404);
  if (!abonnement.actif) return c.json({ error: "Abonnement inactif" }, 409);

  const livraison = await prisma.livraison.create({
    data: {
      abonnementId: abonnementId!,
      date: new Date(parsed.data.date + "T12:00:00"),
      statut: "PLANIFIEE",
    },
  });

  await logAudit({
    userId: user.id,
    action: "PLAN_LIVRAISON",
    entite: "Livraison",
    entiteId: livraison.id,
    nouvelleValeur: { abonnementId, date: parsed.data.date },
  });
  return c.json(livraison, 201);
});

// POST /abonnements/livraisons/:livraisonId/livrer — mark as delivered + create vente
abonnementsRouter.post(
  "/livraisons/:livraisonId/livrer",
  requireRole("GERANT"),
  async (c) => {
    const user = c.get("user");
    const livraisonId = c.req.param("livraisonId");
    const body = await c.req.json().catch(() => null);
    const parsed = z
      .object({
        modePaiement: z
          .enum(["ESPECES", "CB", "CHEQUE", "VIREMENT", "TICKET_RESTO"])
          .optional(),
        montant: z.number().positive().optional(),
      })
      .safeParse(body ?? {});
    if (!parsed.success) return c.json({ error: "Données invalides" }, 422);

    const livraison = await prisma.livraison.findUnique({
      where: { id: livraisonId },
      include: {
        abonnement: {
          include: { lignes: true },
        },
      },
    });
    if (!livraison) return c.json({ error: "Livraison introuvable" }, 404);
    if (livraison.statut !== "PLANIFIEE")
      return c.json({ error: "Livraison déjà traitée" }, 409);

    const lignes = livraison.abonnement.lignes.map((l) => ({
      varianteProduitId: l.varianteProduitId,
      qte: Number(l.qte),
    }));

    // Compute total to build paiement if not provided
    const variantes = await prisma.varianteProduit.findMany({
      where: { id: { in: lignes.map((l) => l.varianteProduitId) } },
    });
    const totalTTC = lignes.reduce((sum, l) => {
      const v = variantes.find((x) => x.id === l.varianteProduitId);
      if (!v) return sum;
      return sum + Number(v.prixTTC) * l.qte;
    }, 0);

    const modePaiement = parsed.data.modePaiement ?? "VIREMENT";
    const montant = parsed.data.montant ?? Math.round(totalTTC * 100) / 100;

    const vente = await createVente(
      user.id,
      lignes,
      [{ mode: modePaiement, montant }],
      { dateOverride: livraison.date, skipClotureCheck: true },
    );

    await prisma.livraison.update({
      where: { id: livraisonId },
      data: { statut: "LIVREE", venteId: vente.id },
    });

    await logAudit({
      userId: user.id,
      action: "LIVRER_ABONNEMENT",
      entite: "Livraison",
      entiteId: livraisonId,
      nouvelleValeur: { venteId: vente.id, numeroTicket: vente.numeroTicket },
    });
    return c.json({ livraison: { id: livraisonId, statut: "LIVREE" }, vente });
  },
);

// POST /abonnements/livraisons/:livraisonId/annuler
abonnementsRouter.post(
  "/livraisons/:livraisonId/annuler",
  requireRole("GERANT"),
  async (c) => {
    const livraisonId = c.req.param("livraisonId");
    const livraison = await prisma.livraison.findUnique({
      where: { id: livraisonId },
    });
    if (!livraison) return c.json({ error: "Livraison introuvable" }, 404);
    if (livraison.statut !== "PLANIFIEE")
      return c.json(
        { error: "Seule une livraison planifiée peut être annulée" },
        409,
      );

    const updated = await prisma.livraison.update({
      where: { id: livraisonId },
      data: { statut: "ANNULEE" },
    });
    return c.json(updated);
  },
);
