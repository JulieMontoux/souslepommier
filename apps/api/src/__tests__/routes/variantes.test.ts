/**
 * Route tests for /api/variantes
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

const GERANT_USER = { id: "u1", username: "g", role: "GERANT" as const, nom: "G", prenom: "G" };
const VENDEUR_USER = { ...GERANT_USER, role: "VENDEUR" as const };

const MOCK_VARIANTE = {
  id: "v1",
  produitId: "p1",
  prixHT: 10,
  tauxTVAId: "tva1",
  tauxTVA: { id: "tva1", libelle: "20%", taux: 20 },
  unitePoids: null,
  emballage: "VRAC",
  poids: 1,
  sku: null,
  venteAuPoids: false,
  stockMin: null,
  stockActuel: 0,
  actif: true,
};

const mockFindMany = vi.fn().mockResolvedValue([MOCK_VARIANTE]);
const mockFindUnique = vi.fn();
const mockCreate = vi.fn().mockResolvedValue(MOCK_VARIANTE);
const mockUpdate = vi.fn().mockResolvedValue(MOCK_VARIANTE);
const mockProduitFindUnique = vi.fn();
const mockTvaFindUnique = vi.fn();
const mockTransaction = vi.fn().mockResolvedValue([]);
const mockPalierFindMany = vi.fn().mockResolvedValue([]);

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    varianteProduit: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
    },
    produit: { findUnique: mockProduitFindUnique },
    tauxTVA: { findUnique: mockTvaFindUnique },
    palierRemise: {
      findMany: mockPalierFindMany,
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: mockTransaction,
  },
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
  const { variantesRouter } = await import("../../routes/variantes.js");
  const app = new Hono();
  app.route("/api/variantes", variantesRouter);
  return app;
}

beforeAll(() => {
  process.env.SIGNING_SECRET = "test-secret-minimum-32-bytes-long!";
});

beforeEach(() => {
  _currentUser = GERANT_USER;
  mockFindUnique.mockReset();
  mockProduitFindUnique.mockReset();
  mockTvaFindUnique.mockReset();
});

describe("GET /api/variantes", () => {
  it("returns list", async () => {
    const app = await makeApp();
    const res = await app.request("/api/variantes");
    expect(res.status).toBe(200);
  });

  it("filters by produitId", async () => {
    const app = await makeApp();
    const res = await app.request("/api/variantes?produitId=p1");
    expect(res.status).toBe(200);
  });
});

describe("POST /api/variantes", () => {
  const VALID = { produitId: "p1", prixHT: 10, tauxTVAId: "tva1", emballage: "VRAC", poids: 1 };

  it("422 invalid", async () => {
    const app = await makeApp();
    const res = await app.request("/api/variantes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });

  it("404 produit not found", async () => {
    mockProduitFindUnique.mockResolvedValueOnce(null);
    mockTvaFindUnique.mockResolvedValueOnce({ id: "tva1", taux: 20 });
    const app = await makeApp();
    const res = await app.request("/api/variantes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID),
    });
    expect(res.status).toBe(404);
  });

  it("404 tauxTVA not found", async () => {
    mockProduitFindUnique.mockResolvedValueOnce({ id: "p1" });
    mockTvaFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/variantes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID),
    });
    expect(res.status).toBe(404);
  });

  it("201 creates", async () => {
    mockProduitFindUnique.mockResolvedValueOnce({ id: "p1" });
    mockTvaFindUnique.mockResolvedValueOnce({ id: "tva1", taux: 20 });
    const app = await makeApp();
    const res = await app.request("/api/variantes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID, sku: "SKU1", unitePoidsId: "up1", venteAuPoids: true }),
    });
    expect(res.status).toBe(201);
  });
});

describe("GET /api/variantes/:id", () => {
  it("200", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_VARIANTE);
    const app = await makeApp();
    const res = await app.request("/api/variantes/v1");
    expect(res.status).toBe(200);
  });

  it("404", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/variantes/missing");
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/variantes/:id", () => {
  it("422 invalid", async () => {
    const app = await makeApp();
    const res = await app.request("/api/variantes/v1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prixHT: -10 }),
    });
    expect(res.status).toBe(422);
  });

  it("404 variant not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/variantes/v1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prixHT: 11 }),
    });
    expect(res.status).toBe(404);
  });

  it("404 tva not found when changing", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_VARIANTE);
    mockTvaFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/variantes/v1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tauxTVAId: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("200 updates everything", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_VARIANTE);
    mockTvaFindUnique.mockResolvedValueOnce({ id: "tva2", taux: 5.5 });
    const app = await makeApp();
    const res = await app.request("/api/variantes/v1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prixHT: 12,
        tauxTVAId: "tva2",
        emballage: "BARQUETTE",
        poids: 2,
        unitePoidsId: "up1",
        sku: "X",
        venteAuPoids: true,
        stockMin: 5,
      }),
    });
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/variantes/bulk-prix", () => {
  it("422 invalid", async () => {
    const app = await makeApp();
    const res = await app.request("/api/variantes/bulk-prix", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("bad"),
    });
    expect(res.status).toBe(422);
  });

  it("counts updates (one ok, one missing)", async () => {
    mockFindUnique.mockResolvedValueOnce({ tauxTVA: { taux: 20 } });
    mockUpdate.mockResolvedValueOnce({ id: "v1", prixHT: 12, tauxTVA: { id: "tva1", libelle: "20%", taux: 20 } });
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/variantes/bulk-prix", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ id: "v1", prixHT: 12 }, { id: "missing", prixHT: 5 }]),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated).toBe(1);
  });

  it("403 for VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/variantes/bulk-prix", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ id: "v1", prixHT: 12 }]),
    });
    expect(res.status).toBe(403);
  });
});

describe("PUT /api/variantes/:id/paliers", () => {
  it("422 invalid", async () => {
    const app = await makeApp();
    const res = await app.request("/api/variantes/v1/paliers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ qteMin: 1, remisePct: 200 }]),
    });
    expect(res.status).toBe(422);
  });

  it("404 variante not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/variantes/missing/paliers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ qteMin: 10, remisePct: 5 }]),
    });
    expect(res.status).toBe(404);
  });

  it("200 sets paliers", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_VARIANTE);
    mockPalierFindMany.mockResolvedValueOnce([
      { id: "pal1", qteMin: 10, remisePct: 5 },
    ]);
    const app = await makeApp();
    const res = await app.request("/api/variantes/v1/paliers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ qteMin: 10, remisePct: 5 }]),
    });
    expect(res.status).toBe(200);
  });
});

describe("GET /api/variantes/:id/paliers", () => {
  it("200 list", async () => {
    mockPalierFindMany.mockResolvedValueOnce([{ id: "pal1", qteMin: 10, remisePct: 5 }]);
    const app = await makeApp();
    const res = await app.request("/api/variantes/v1/paliers");
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/variantes/:id/statut", () => {
  it("422 invalid", async () => {
    const app = await makeApp();
    const res = await app.request("/api/variantes/v1/statut", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });

  it("404 not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/variantes/missing/statut", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: false }),
    });
    expect(res.status).toBe(404);
  });

  it("200 toggles", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_VARIANTE);
    const app = await makeApp();
    const res = await app.request("/api/variantes/v1/statut", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: false }),
    });
    expect(res.status).toBe(200);
  });
});
