/**
 * Route tests for /api/stats
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

const GERANT_USER = { id: "u1", username: "g", role: "GERANT" as const, nom: "G", prenom: "G" };
const VENDEUR_USER = { ...GERANT_USER, role: "VENDEUR" as const };

const MOCK_VENTE = {
  id: "vente-1",
  numeroTicket: "T001",
  date: new Date("2026-01-15T10:00:00Z"),
  totalHT: 100,
  totalTTC: 120,
  vendeur: { prenom: "P", nom: "N" },
  paiements: [
    { mode: "CB", montant: 60, renduMonnaie: 0, reference: "" },
    { mode: "ESPECES", montant: 60, renduMonnaie: 5, reference: "" },
  ],
  lignes: [
    {
      qte: 2,
      montantHT: 50,
      montantTVA: 10,
      montantTTC: 60,
      tauxTVA: 20,
      variante: { produit: { id: "p1", nom: "Pomme" } },
    },
  ],
};

const MOCK_LIGNE = {
  tauxTVA: 20,
  montantHT: 100,
  montantTVA: 20,
  montantTTC: 120,
  vente: { date: new Date("2026-03-15") },
};

const mockVenteFindMany = vi.fn().mockResolvedValue([MOCK_VENTE]);
const mockLigneFindMany = vi.fn().mockResolvedValue([MOCK_LIGNE]);

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    vente: { findMany: mockVenteFindMany },
    ligneVente: { findMany: mockLigneFindMany },
  },
}));

vi.mock("../../lib/compute-stats.js", () => ({
  computeDayStats: vi.fn().mockResolvedValue({ totalTTC: 100, nbVentes: 5 }),
  computePeriodStats: vi.fn().mockResolvedValue({ totalTTC: 1000, nbVentes: 50 }),
  computeYearStats: vi.fn().mockResolvedValue({ totalTTC: 10000, nbVentes: 500 }),
}));

let _currentUser = GERANT_USER;

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
  const { statsRouter } = await import("../../routes/stats.js");
  const app = new Hono();
  app.route("/api/stats", statsRouter);
  return app;
}

beforeAll(() => {
  process.env.SIGNING_SECRET = "test-secret-minimum-32-bytes-long!";
});

beforeEach(() => {
  _currentUser = GERANT_USER;
});

describe("GET /api/stats/today", () => {
  it("200", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stats/today");
    expect(res.status).toBe(200);
  });

  it("403 VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/stats/today");
    expect(res.status).toBe(403);
  });
});

describe("GET /api/stats/day/:date", () => {
  it("200 valid date", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stats/day/2026-01-15");
    expect(res.status).toBe(200);
  });

  it("400 invalid date", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stats/day/not-a-date");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/stats/period", () => {
  it("400 missing params", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stats/period");
    expect(res.status).toBe(400);
  });

  it("400 invalid dates", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stats/period?from=bad&to=bad");
    expect(res.status).toBe(400);
  });

  it("200", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stats/period?from=2026-01-01&to=2026-12-31");
    expect(res.status).toBe(200);
  });
});

describe("GET /api/stats/year/:year", () => {
  it("400 invalid year", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stats/year/bad");
    expect(res.status).toBe(400);
  });

  it("400 out of range", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stats/year/1500");
    expect(res.status).toBe(400);
  });

  it("200", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stats/year/2026");
    expect(res.status).toBe(200);
  });
});

describe("GET /api/stats/payment-modes", () => {
  it("200 default period", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stats/payment-modes");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("200 with from/to", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stats/payment-modes?from=2026-01-01&to=2026-12-31");
    expect(res.status).toBe(200);
  });
});

describe("GET /api/stats/products/top", () => {
  it("200 default", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stats/products/top");
    expect(res.status).toBe(200);
  });

  it("200 with from/to/limit", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stats/products/top?from=2026-01-01&to=2026-12-31&limit=5");
    expect(res.status).toBe(200);
  });

  it("aggregates same product across ventes", async () => {
    const dup = { ...MOCK_VENTE, id: "vente-2", lignes: MOCK_VENTE.lignes };
    mockVenteFindMany.mockResolvedValueOnce([MOCK_VENTE, dup]);
    const app = await makeApp();
    const res = await app.request("/api/stats/products/top");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].qte).toBe(4);
  });
});

describe("GET /api/stats/tva-export", () => {
  it("400 invalid year", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stats/tva-export?year=bad");
    expect(res.status).toBe(400);
  });

  it("200 with valid year", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stats/tva-export?year=2026");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/csv/);
  });

  it("200 default year", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stats/tva-export");
    expect(res.status).toBe(200);
  });

  it("aggregates multiple lines same month+taux", async () => {
    mockLigneFindMany.mockResolvedValueOnce([MOCK_LIGNE, MOCK_LIGNE]);
    const app = await makeApp();
    const res = await app.request("/api/stats/tva-export?year=2026");
    expect(res.status).toBe(200);
  });
});

describe("GET /api/stats/export", () => {
  it("400 missing params", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stats/export");
    expect(res.status).toBe(400);
  });

  it("200 CSV", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stats/export?from=2026-01-01&to=2026-12-31");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/csv/);
  });
});
