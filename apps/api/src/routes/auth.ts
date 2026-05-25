import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signJwt, verifyJwt, MAX_AGE } from "../lib/jwt.js";
import { checkRateLimit, resetRateLimit } from "../lib/rate-limit.js";
import { logAudit } from "../lib/audit.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = new Hono();

authRouter.post("/login", async (c) => {
  const ip =
    c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown";
  const userAgent = c.req.header("user-agent") ?? "";

  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Données invalides" }, 422);

  const { email, password } = parsed.data;
  const rateLimitKey = `login:${ip}`;
  const rateCheck = checkRateLimit(rateLimitKey);
  if (!rateCheck.allowed) {
    await logAudit({
      action: "LOGIN_BLOCKED",
      entite: "User",
      nouvelleValeur: { email },
      ip,
      userAgent,
    });
    return c.json(
      { error: "Trop de tentatives. Réessayez dans 15 minutes." },
      429,
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.actif) {
    await logAudit({
      action: "LOGIN_FAILED",
      entite: "User",
      nouvelleValeur: {
        email,
        reason: !user ? "user_not_found" : "user_inactive",
      },
      ip,
      userAgent,
    });
    return c.json({ error: "Email ou mot de passe incorrect" }, 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await logAudit({
      userId: user.id,
      action: "LOGIN_FAILED",
      entite: "User",
      entiteId: user.id,
      nouvelleValeur: { reason: "invalid_password" },
      ip,
      userAgent,
    });
    return c.json({ error: "Email ou mot de passe incorrect" }, 401);
  }

  resetRateLimit(rateLimitKey);
  const token = await signJwt({
    id: user.id,
    email: user.email,
    role: user.role as "GERANT" | "VENDEUR",
    nom: user.nom,
    prenom: user.prenom,
  });

  await Promise.all([
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
    logAudit({
      userId: user.id,
      action: "LOGIN_SUCCESS",
      entite: "User",
      entiteId: user.id,
      ip,
      userAgent,
    }),
  ]);

  setCookie(c, "session", token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });

  return c.json({
    id: user.id,
    email: user.email,
    role: user.role,
    nom: user.nom,
    prenom: user.prenom,
  });
});

authRouter.post("/logout", async (c) => {
  const token = getCookie(c, "session");
  if (token) {
    const payload = await verifyJwt(token);
    if (payload) {
      const ip = c.req.header("x-forwarded-for") ?? "unknown";
      await logAudit({
        userId: payload.id,
        action: "LOGOUT",
        entite: "User",
        entiteId: payload.id,
        ip,
      });
    }
  }
  deleteCookie(c, "session", { path: "/" });
  return c.json({ ok: true });
});

authRouter.get("/me", async (c) => {
  const token = getCookie(c, "session");
  if (!token) return c.json({ error: "Non autorisé" }, 401);

  const payload = await verifyJwt(token);
  if (!payload) return c.json({ error: "Session expirée" }, 401);

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      email: true,
      role: true,
      nom: true,
      prenom: true,
      actif: true,
    },
  });
  if (!user?.actif) return c.json({ error: "Compte désactivé" }, 401);

  return c.json(user);
});
