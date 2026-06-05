/**
 * Route tests for /api/stock
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

const GERANT_USER = { id: "u1", username: "g", role: "GERANT" as const, nom: "G", prenom: "G" };
const VENDEUR_USER = { ...GERANT_USER, role: "VENDEUR" as const };

const MOCK_VARIANTE = {
  id: "v1",
  produitId: "p1",
  produit: { id: "p1", nom: "Pomme", categorie: { nom: "Fruits" } },
  poids: 1,
  emballage: "VRAC",
  venteAuPoids: false,
  stockActuel: 10,
  stockMin: 2,
  sku: null,
};

const mockFindMany = vi.fn().mockResolvedValue([MOCK_VARIANTE]);
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn().mockResolvedValue(MOCK_VARIANTE);
const mockMouvementCreate = vi.fn().mockResolvedValue({});
const mockMouvementFindMany = vi.fn().mockResolvedValue([]);
const mockQueryRaw = vi.fn().mockResolvedValue([
  { id: "v1", produitNom: "Pomme", venteAuPoids: false, stockActuel: 1, stockMin: 5 },
]);
const mockTransaction = vi.fn().mockResolvedValue([]);

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    varianteProduit: { findMany: mockFindMany, findUnique: mockFindUnique, update: mockUpdate },
    mouvementStock: { create: mockMouvementCreate, findMany: mockMouvementFindMany },
    $queryRaw: mockQueryRaw,
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
  const { stockRouter } = await import("../../routes/stock.js");
  const app = new Hono();
  app.route("/api/stock", stockRouter);
  return app;
}

beforeAll(() => {
  process.env.SIGNING_SECRET = "test-secret-minimum-32-bytes-long!";
});

beforeEach(() => {
  _currentUser = GERANT_USER;
  mockFindUnique.mockReset();
});

describe("GET /api/stock", () => {
  it("returns list", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stock");
    expect(res.status).toBe(200);
  });

  it("handles null poids/stockMin", async () => {
    mockFindMany.mockResolvedValueOnce([
      { ...MOCK_VARIANTE, poids: null, stockMin: null, produit: { ...MOCK_VARIANTE.produit, categorie: null } },
    ]);
    const app = await makeApp();
    const res = await app.request("/api/stock");
    expect(res.status).toBe(200);
  });
});

describe("GET /api/stock/alerts", () => {
  it("returns alerts via raw query", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stock/alerts");
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/stock/:varianteId", () => {
  it("422 invalid", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stock/v1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "WRONG", quantite: 1 }),
    });
    expect(res.status).toBe(422);
  });

  it("404 variant not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/stock/missing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ENTREE", quantite: 5 }),
    });
    expect(res.status).toBe(404);
  });

  it("200 ENTREE", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_VARIANTE);
    mockFindUnique.mockResolvedValueOnce({ stockActuel: 15, stockMin: 2 });
    const app = await makeApp();
    const res = await app.request("/api/stock/v1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ENTREE", quantite: 5 }),
    });
    expect(res.status).toBe(200);
  });

  it("200 SORTIE", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_VARIANTE);
    mockFindUnique.mockResolvedValueOnce({ stockActuel: 5, stockMin: 2 });
    const app = await makeApp();
    const res = await app.request("/api/stock/v1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "SORTIE", quantite: 5 }),
    });
    expect(res.status).toBe(200);
  });

  it("200 AJUSTEMENT with stockMin update", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_VARIANTE);
    mockFindUnique.mockResolvedValueOnce({ stockActuel: 7, stockMin: 3 });
    const app = await makeApp();
    const res = await app.request("/api/stock/v1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "AJUSTEMENT", quantite: 7, motif: "inventaire", stockMin: 3 }),
    });
    expect(res.status).toBe(200);
  });

  it("200 with stockMin=null", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_VARIANTE);
    mockFindUnique.mockResolvedValueOnce({ stockActuel: 8, stockMin: null });
    const app = await makeApp();
    const res = await app.request("/api/stock/v1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "AJUSTEMENT", quantite: 8, stockMin: null }),
    });
    expect(res.status).toBe(200);
  });

  it("403 for VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/stock/v1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ENTREE", quantite: 1 }),
    });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/stock/:varianteId/mouvements", () => {
  it("200 list", async () => {
    const app = await makeApp();
    const res = await app.request("/api/stock/v1/mouvements");
    expect(res.status).toBe(200);
  });
});
