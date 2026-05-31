import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signJwt, verifyJwt, MAX_AGE } from "../lib/jwt.js";
import { checkRateLimit, resetRateLimit } from "../lib/rate-limit.js";
import { logAudit } from "../lib/audit.js";
import { sendForgotPasswordEmail } from "../lib/email.js";
import { authMiddleware, type HonoEnv } from "../lib/middleware.js";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const authRouter = new Hono<HonoEnv>();

authRouter.post("/login", async (c) => {
  const ip =
    c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown";
  const userAgent = c.req.header("user-agent") ?? "";

  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Données invalides" }, 422);

  const { username, password } = parsed.data;
  const rateLimitKey = `login:${ip}`;
  const rateCheck = checkRateLimit(rateLimitKey);
  if (!rateCheck.allowed) {
    await logAudit({
      action: "LOGIN_BLOCKED",
      entite: "User",
      nouvelleValeur: { username },
      ip,
      userAgent,
    });
    return c.json(
      { error: "Trop de tentatives. Réessayez dans 15 minutes." },
      429,
    );
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.actif) {
    await logAudit({
      action: "LOGIN_FAILED",
      entite: "User",
      nouvelleValeur: {
        username,
        reason: !user ? "user_not_found" : "user_inactive",
      },
      ip,
      userAgent,
    });
    return c.json({ error: "Identifiant ou mot de passe incorrect" }, 401);
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
    return c.json({ error: "Identifiant ou mot de passe incorrect" }, 401);
  }

  resetRateLimit(rateLimitKey);
  const token = await signJwt({
    id: user.id,
    username: user.username,
    role: user.role as "SUPERADMIN" | "GERANT" | "VENDEUR",
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
    secure: process.env.COOKIE_SECURE === "true",
  });

  return c.json({
    id: user.id,
    username: user.username,
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
      username: true,
      role: true,
      nom: true,
      prenom: true,
      actif: true,
    },
  });
  if (!user?.actif) return c.json({ error: "Compte désactivé" }, 401);

  return c.json(user);
});

authRouter.post("/forgot-password", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ login: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return c.json({ ok: true }); // don't leak validation errors

  const { login } = parsed.data;
  const ip = c.req.header("x-forwarded-for") ?? "unknown";
  const userAgent = c.req.header("user-agent") ?? "";

  const user = await prisma.user.findFirst({
    where: {
      actif: true,
      OR: [{ username: login }, { email: login }],
    },
    select: { id: true, username: true, email: true, prenom: true },
  });

  // Always return ok — don't reveal if user/email exists
  if (!user?.email) return c.json({ ok: true });

  // Invalidate previous unused tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { expiresAt: new Date() },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:5173";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  try {
    await sendForgotPasswordEmail(user.email, user.prenom, resetUrl);
  } catch {
    /* non-bloquant */
  }

  await logAudit({
    userId: user.id,
    action: "FORGOT_PASSWORD",
    entite: "User",
    entiteId: user.id,
    ip,
    userAgent,
  });

  return c.json({ ok: true });
});

authRouter.post("/reset-password", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = z
    .object({
      token: z.string().min(1),
      newPassword: z.string().min(8, "Minimum 8 caractères"),
    })
    .safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  const { token, newPassword } = parsed.data;
  const now = new Date();

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expiresAt < now)
    return c.json({ error: "Lien invalide ou expiré" }, 400);

  await Promise.all([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    }),
  ]);

  await logAudit({
    userId: record.userId,
    action: "RESET_PASSWORD_TOKEN",
    entite: "User",
    entiteId: record.userId,
  });

  return c.json({ ok: true });
});

authRouter.post("/change-password", authMiddleware, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = z
    .object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8, "Minimum 8 caractères"),
    })
    .safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      422,
    );

  const target = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!target) return c.json({ error: "Utilisateur introuvable" }, 404);

  const valid = await bcrypt.compare(
    parsed.data.currentPassword,
    target.passwordHash,
  );
  if (!valid) return c.json({ error: "Mot de passe actuel incorrect" }, 401);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) },
  });
  await logAudit({
    userId: user.id,
    action: "RESET_PASSWORD",
    entite: "User",
    entiteId: user.id,
    nouvelleValeur: { self: true },
  });
  return c.json({ ok: true });
});
