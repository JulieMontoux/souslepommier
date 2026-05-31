import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verifyJwt, type JwtPayload } from "./jwt.js";

export type HonoEnv = {
  Variables: { user: JwtPayload };
};

export async function authMiddleware(c: Context<HonoEnv>, next: Next) {
  const token = getCookie(c, "session");
  if (!token) return c.json({ error: "Non autorisé" }, 401);

  const payload = await verifyJwt(token);
  if (!payload) return c.json({ error: "Session expirée" }, 401);

  const { prisma } = await import("./prisma.js");
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { actif: true },
  });
  if (!user?.actif) return c.json({ error: "Compte désactivé" }, 401);

  c.set("user", payload);
  await next();
}

export function requireRole(...roles: ("GERANT" | "VENDEUR")[]) {
  return async (c: Context<HonoEnv>, next: Next) => {
    await authMiddleware(c, next);
    if (c.finalized) return;
    const user = c.get("user");
    if (!roles.includes(user.role))
      return c.json({ error: "Accès refusé" }, 403);
    await next();
  };
}
