/**
 * Route tests for /api/points-de-vente
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

const GERANT_USER = { id: "u1", username: "g", role: "GERANT" as const, nom: "G", prenom: "G" };
const VENDEUR_USER = { ...GERANT_USER, role: "VENDEUR" as const };

const MOCK_PDV = { id: "pdv-1", nom: "Marché", actif: true };

const mockFindMany = vi.fn().mockResolvedValue([MOCK_PDV]);
const mockFindUnique = vi.fn();
const mockCreate = vi.fn().mockResolvedValue(MOCK_PDV);
const mockUpdate = vi.fn().mockResolvedValue(MOCK_PDV);

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    pointDeVente: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
    },
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
  const { pointsDeVenteRouter } = await import("../../routes/points-de-vente.js");
  const app = new Hono();
  app.route("/api/points-de-vente", pointsDeVenteRouter);
  return app;
}

beforeAll(() => {
  process.env.SIGNING_SECRET = "test-secret-minimum-32-bytes-long!";
});

beforeEach(() => {
  _currentUser = GERANT_USER;
});

describe("GET /api/points-de-vente", () => {
  it("returns list", async () => {
    const app = await makeApp();
    const res = await app.request("/api/points-de-vente");
    expect(res.status).toBe(200);
  });

  it("filters by actif=true", async () => {
    const app = await makeApp();
    const res = await app.request("/api/points-de-vente?actif=true");
    expect(res.status).toBe(200);
  });

  it("filters by actif=false", async () => {
    const app = await makeApp();
    const res = await app.request("/api/points-de-vente?actif=false");
    expect(res.status).toBe(200);
  });
});

describe("POST /api/points-de-vente", () => {
  it("creates pdv", async () => {
    const app = await makeApp();
    const res = await app.request("/api/points-de-vente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: "Marché" }),
    });
    expect(res.status).toBe(201);
  });

  it("422 missing nom", async () => {
    const app = await makeApp();
    const res = await app.request("/api/points-de-vente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });

  it("403 for VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/points-de-vente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: "X" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("PUT /api/points-de-vente/:id", () => {
  it("updates pdv", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_PDV);
    const app = await makeApp();
    const res = await app.request("/api/points-de-vente/pdv-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: "Marché Bio", actif: false }),
    });
    expect(res.status).toBe(200);
  });

  it("404 when not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/points-de-vente/missing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: "X" }),
    });
    expect(res.status).toBe(404);
  });

  it("422 invalid", async () => {
    const app = await makeApp();
    const res = await app.request("/api/points-de-vente/pdv-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: "" }),
    });
    expect(res.status).toBe(422);
  });
});
