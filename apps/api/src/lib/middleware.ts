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
    select: { actif: true, role: true },
  });
  if (!user?.actif) return c.json({ error: "Compte désactivé" }, 401);

  const role = user.role as JwtPayload["role"];
  c.set("user", { ...payload, role });
  await next();
}

export function requireRole(...roles: ("SUPERADMIN" | "GERANT" | "VENDEUR")[]) {
  return async (c: Context<HonoEnv>, next: Next) => {
    const token = getCookie(c, "session");
    if (!token) return c.json({ error: "Non autorisé" }, 401);

    const payload = await verifyJwt(token);
    if (!payload) return c.json({ error: "Session expirée" }, 401);

    const { prisma } = await import("./prisma.js");
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { actif: true, role: true },
    });
    if (!user?.actif) return c.json({ error: "Compte désactivé" }, 401);

    const role = user.role as JwtPayload["role"];
    c.set("user", { ...payload, role });

    if (role !== "SUPERADMIN" && !roles.includes(role))
      return c.json({ error: "Accès refusé" }, 403);

    await next();
  };
}
