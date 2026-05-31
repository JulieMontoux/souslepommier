import { Hono } from "hono";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { logAudit } from "../lib/audit.js";

const setupSchema = z.object({
  token: z.string().min(1),
  username: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9._-]+$/),
  email: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().email().optional().nullable(),
  ),
  prenom: z.string().min(1).max(50),
  nom: z.string().min(1).max(50),
  role: z.enum(["SUPERADMIN", "GERANT", "VENDEUR"]),
  password: z.string().min(8),
});

export const setupRouter = new Hono();

setupRouter.post("/create-user", async (c) => {
  const secret = process.env["SETUP_SECRET"];
  if (!secret) return c.json({ error: "Setup désactivé" }, 403);

  const body = await c.req.json().catch(() => null);
  const parsed = setupSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  if (parsed.data.token !== secret)
    return c.json({ error: "Token invalide" }, 403);

  const { username, email, prenom, nom, role, password } = parsed.data;

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
    action: "CREATE_USER",
    entite: "User",
    entiteId: user.id,
    nouvelleValeur: { username, email, prenom, nom, role, source: "setup" },
    ip: c.req.header("x-forwarded-for") ?? "unknown",
  });

  return c.json(user, 201);
});
