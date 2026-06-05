/**
 * Route tests for /api/audit (SUPERADMIN only)
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

const SUPERADMIN = { id: "u1", username: "su", role: "SUPERADMIN" as const, nom: "S", prenom: "S" };
const GERANT_USER = { ...SUPERADMIN, role: "GERANT" as const };

const MOCK_LOG = {
  id: "l1",
  userId: "u1",
  action: "LOGIN_SUCCESS",
  entite: "User",
  entiteId: "u1",
  timestamp: new Date(),
  ip: "127.0.0.1",
  user: { id: "u1", prenom: "P", nom: "N" },
};

const mockCount = vi.fn().mockResolvedValue(1);
const mockFindMany = vi.fn().mockResolvedValue([MOCK_LOG]);
const mockVenteFindMany = vi.fn().mockResolvedValue([]);

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    journalAudit: { count: mockCount, findMany: mockFindMany },
    vente: { findMany: mockVenteFindMany },
  },
}));

let _currentUser = SUPERADMIN;

vi.mock("../../lib/middleware.js", () => ({
  authMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("user", _currentUser);
    await next();
  }),
  requireRole: (..._roles: string[]) =>
    vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
      c.set("user", _currentUser);
      const role = _currentUser.role;
      if (role !== "SUPERADMIN" && !_roles.includes(role)) {
        return new Response(JSON.stringify({ error: "Accès refusé" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
      await next();
    }),
  HonoEnv: {},
}));

async function makeApp() {
  const { auditRouter } = await import("../../routes/audit.js");
  const app = new Hono();
  app.route("/api/audit", auditRouter);
  return app;
}

beforeAll(() => {
  process.env.SIGNING_SECRET = "test-secret-minimum-32-bytes-long!";
});

beforeEach(() => {
  _currentUser = SUPERADMIN;
});

describe("GET /api/audit", () => {
  it("returns paginated logs", async () => {
    const app = await makeApp();
    const res = await app.request("/api/audit");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta).toBeDefined();
    expect(body.data).toBeDefined();
  });

  it("applies filters userId/action/entite/from/to/page", async () => {
    const app = await makeApp();
    const res = await app.request("/api/audit?userId=u1&action=LOGIN_SUCCESS&entite=User&from=2026-01-01&to=2026-12-31&page=2");
    expect(res.status).toBe(200);
  });

  it("returns CSV when format=csv", async () => {
    const app = await makeApp();
    const res = await app.request("/api/audit?format=csv");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/csv/);
  });

  it("CSV handles missing user", async () => {
    mockFindMany.mockResolvedValueOnce([{ ...MOCK_LOG, user: null, entiteId: null, ip: null }]);
    const app = await makeApp();
    const res = await app.request("/api/audit?format=csv");
    expect(res.status).toBe(200);
  });

  it("403 for GERANT", async () => {
    _currentUser = GERANT_USER;
    const app = await makeApp();
    const res = await app.request("/api/audit");
    expect(res.status).toBe(403);
  });
});

describe("GET /api/audit/verify", () => {
  it("returns count of ventes", async () => {
    const app = await makeApp();
    const res = await app.request("/api/audit/verify");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(0);
  });

  it("filters by from/to", async () => {
    const app = await makeApp();
    const res = await app.request("/api/audit/verify?from=2026-01-01&to=2026-12-31");
    expect(res.status).toBe(200);
  });
});
