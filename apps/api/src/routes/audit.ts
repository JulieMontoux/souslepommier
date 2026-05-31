import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireRole, type HonoEnv } from "../lib/middleware.js";

const PAGE_SIZE = 50;

export const auditRouter = new Hono<HonoEnv>();

auditRouter.use("*", requireRole("SUPERADMIN"));

auditRouter.get("/", async (c) => {
  const userId = c.req.query("userId") || undefined;
  const action = c.req.query("action") || undefined;
  const entite = c.req.query("entite") || undefined;
  const from = c.req.query("from");
  const to = c.req.query("to");
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1"));
  const csv = c.req.query("format") === "csv";

  const where = {
    ...(userId && { userId }),
    ...(action && { action }),
    ...(entite && { entite }),
    ...(from || to
      ? {
          timestamp: {
            ...(from && { gte: new Date(from) }),
            ...(to && {
              lte: new Date(new Date(to).setHours(23, 59, 59, 999)),
            }),
          },
        }
      : {}),
  };

  if (csv) {
    const logs = await prisma.journalAudit.findMany({
      where,
      include: { user: { select: { prenom: true, nom: true } } },
      orderBy: { timestamp: "desc" },
      take: 10000,
    });
    const rows = [
      "timestamp,user,action,entite,entiteId,ip",
      ...logs.map((l) => {
        const user = l.user ? `${l.user.prenom} ${l.user.nom}` : "Système";
        return [
          new Date(l.timestamp).toISOString(),
          `"${user}"`,
          l.action,
          l.entite,
          l.entiteId ?? "",
          l.ip ?? "",
        ].join(",");
      }),
    ].join("\n");
    return new Response(rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const skip = (page - 1) * PAGE_SIZE;
  const [total, logs] = await Promise.all([
    prisma.journalAudit.count({ where }),
    prisma.journalAudit.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: { timestamp: "desc" },
      include: { user: { select: { id: true, prenom: true, nom: true } } },
    }),
  ]);

  return c.json({
    data: logs,
    meta: {
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  });
});

auditRouter.get("/verify", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  const ventes = await prisma.vente.findMany({
    where: {
      statut: "FINALISEE",
      ...(from || to
        ? {
            date: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    },
    select: {
      id: true,
      numeroTicket: true,
      hash: true,
      hashPrecedent: true,
      date: true,
      totalTTC: true,
      vendeurId: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return c.json({
    count: ventes.length,
    message: "Chaîne HMAC vérifiable côté client",
  });
});
