import { Hono } from "hono";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "../lib/prisma.js";
import { requireRole, type HonoEnv } from "../lib/middleware.js";
import { logAudit } from "../lib/audit.js";
import { sendWelcomeEmail, sendResetPasswordEmail } from "../lib/email.js";

const userCreateSchema = z.object({
  username: z
    .string()
    .min(1)
    .max(50)
    .regex(
      /^[a-z0-9._-]+$/,
      "Identifiants valides : lettres minuscules, chiffres, . _ -",
    ),
  email: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().email().optional().nullable(),
  ),
  prenom: z.string().min(1).max(50),
  nom: z.string().min(1).max(50),
  role: z.enum(["VENDEUR", "GERANT"]).default("VENDEUR"),
});

const userUpdateSchema = z.object({
  username: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9._-]+$/)
    .optional(),
  prenom: z.string().min(1).max(50).optional(),
  nom: z.string().min(1).max(50).optional(),
  email: z.string().email().optional().nullable(),
  role: z.enum(["VENDEUR", "GERANT"]).optional(),
});

export const usersRouter = new Hono<HonoEnv>();

usersRouter.use("*", requireRole("GERANT"));

usersRouter.get("/", async (c) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const users = await prisma.user.findMany({
    orderBy: [{ actif: "desc" }, { nom: "asc" }],
    select: {
      id: true,
      username: true,
      email: true,
      prenom: true,
      nom: true,
      role: true,
      actif: true,
      lastLoginAt: true,
      createdAt: true,
      _count: {
        select: {
          ventes: {
            where: { date: { gte: startOfMonth }, statut: "FINALISEE" },
          },
        },
      },
    },
  });
  return c.json(
    users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      prenom: u.prenom,
      nom: u.nom,
      role: u.role,
      actif: u.actif,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      nbVentesMois: u._count.ventes,
    })),
  );
});

usersRouter.post("/", async (c) => {
  const caller = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = userCreateSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  const { username, email, prenom, nom, role } = parsed.data;

  // GERANT can only create VENDEUR; SUPERADMIN can create GERANT or VENDEUR
  if (caller.role !== "SUPERADMIN" && role === "GERANT")
    return c.json({ error: "Accès refusé" }, 403);

  const existingUsername = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (existingUsername)
    return c.json({ error: "Identifiant déjà utilisé" }, 409);

  if (email) {
    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingEmail) return c.json({ error: "Email déjà utilisé" }, 409);
  }

  const password = randomBytes(6).toString("base64url").slice(0, 10);
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { username, email: email ?? null, prenom, nom, role, passwordHash },
    select: {
      id: true,
      username: true,
      email: true,
      prenom: true,
      nom: true,
      role: true,
      createdAt: true,
    },
  });

  await logAudit({
    userId: c.get("user").id,
    action: "CREATE_USER",
    entite: "User",
    entiteId: user.id,
    nouvelleValeur: { username, email, prenom, nom, role },
  });
  try {
    if (email) await sendWelcomeEmail(email, prenom, password);
  } catch {
    /* non-bloquant */
  }

  return c.json(user, 201);
});

usersRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      prenom: true,
      nom: true,
      role: true,
      actif: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  if (!user) return c.json({ error: "Utilisateur introuvable" }, 404);

  const [ventesMois, ventesWeek, ventesTotal] = await Promise.all([
    prisma.vente.aggregate({
      where: {
        vendeurId: id,
        date: { gte: startOfMonth },
        statut: "FINALISEE",
      },
      _count: { id: true },
      _sum: { totalHT: true, totalTTC: true },
    }),
    prisma.vente.aggregate({
      where: { vendeurId: id, date: { gte: startOfWeek }, statut: "FINALISEE" },
      _sum: { totalHT: true, totalTTC: true },
    }),
    prisma.vente.count({ where: { vendeurId: id, statut: "FINALISEE" } }),
  ]);

  return c.json({
    ...user,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    nbVentesMois: ventesMois._count.id,
    nbVentesTotal: ventesTotal,
    caMoisHT: Number(ventesMois._sum.totalHT ?? 0),
    caMoisTTC: Number(ventesMois._sum.totalTTC ?? 0),
    caWeekHT: Number(ventesWeek._sum.totalHT ?? 0),
    caWeekTTC: Number(ventesWeek._sum.totalTTC ?? 0),
  });
});

usersRouter.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = userUpdateSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return c.json({ error: "Utilisateur introuvable" }, 404);

  if (parsed.data.username) {
    const taken = await prisma.user.findFirst({
      where: { username: parsed.data.username, NOT: { id } },
      select: { id: true },
    });
    if (taken) return c.json({ error: "Identifiant déjà utilisé" }, 409);
  }
  if (parsed.data.email) {
    const taken = await prisma.user.findFirst({
      where: { email: parsed.data.email, NOT: { id } },
      select: { id: true },
    });
    if (taken) return c.json({ error: "Email déjà utilisé" }, 409);
  }

  const user = await prisma.user.update({ where: { id }, data: parsed.data });
  await logAudit({
    userId: c.get("user").id,
    action: "UPDATE_USER",
    entite: "User",
    entiteId: id,
    nouvelleValeur: parsed.data as Record<string, unknown>,
  });
  return c.json(user);
});

usersRouter.patch("/:id/statut", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  if (id === user.id)
    return c.json({ error: "Impossible de se désactiver soi-même" }, 409);

  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ actif: z.boolean() }).safeParse(body);
  if (!parsed.success) return c.json({ error: "Données invalides" }, 422);

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return c.json({ error: "Utilisateur introuvable" }, 404);

  await prisma.user.update({
    where: { id },
    data: { actif: parsed.data.actif },
  });
  await logAudit({
    userId: user.id,
    action: parsed.data.actif ? "ACTIVATE_USER" : "DEACTIVATE_USER",
    entite: "User",
    entiteId: id,
    nouvelleValeur: { actif: parsed.data.actif },
  });
  return new Response(null, { status: 204 });
});

usersRouter.post("/:id/reset-password", async (c) => {
  const id = c.req.param("id");
  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      prenom: true,
      actif: true,
    },
  });
  if (!target) return c.json({ error: "Utilisateur introuvable" }, 404);
  if (!target.actif) return c.json({ error: "Utilisateur inactif" }, 409);

  const password = randomBytes(6).toString("base64url").slice(0, 10);
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });
  await logAudit({
    userId: c.get("user").id,
    action: "RESET_PASSWORD",
    entite: "User",
    entiteId: id,
    nouvelleValeur: { username: target.username },
  });
  try {
    if (target.email)
      await sendResetPasswordEmail(target.email, target.prenom, password);
  } catch {
    /* non-bloquant */
  }

  return c.json({ password, emailSent: !!target.email });
});
