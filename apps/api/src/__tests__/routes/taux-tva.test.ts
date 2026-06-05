/**
 * Route tests for /api/taux-tva
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

const GERANT_USER = { id: "u1", username: "g", role: "GERANT" as const, nom: "G", prenom: "G" };
const VENDEUR_USER = { ...GERANT_USER, role: "VENDEUR" as const };

const MOCK_TVA = { id: "tva-1", libelle: "Standard", taux: 20, defaut: true, actif: true, dateEffet: new Date() };

const mockFindMany = vi.fn().mockResolvedValue([MOCK_TVA]);
const mockFindUnique = vi.fn();
const mockCreate = vi.fn().mockResolvedValue(MOCK_TVA);
const mockUpdate = vi.fn().mockResolvedValue(MOCK_TVA);
const mockUpdateMany = vi.fn().mockResolvedValue({ count: 1 });

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    tauxTVA: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
      updateMany: mockUpdateMany,
    },
  },
}));

vi.mock("../../lib/audit.js", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
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
  const { tauxTvaRouter } = await import("../../routes/taux-tva.js");
  const app = new Hono();
  app.route("/api/taux-tva", tauxTvaRouter);
  return app;
}

beforeAll(() => {
  process.env.SIGNING_SECRET = "test-secret-minimum-32-bytes-long!";
});

beforeEach(() => {
  _currentUser = GERANT_USER;
});

describe("GET /api/taux-tva", () => {
  it("returns list", async () => {
    const app = await makeApp();
    const res = await app.request("/api/taux-tva");
    expect(res.status).toBe(200);
  });
});

describe("POST /api/taux-tva", () => {
  it("creates with valid payload (defaut=true triggers updateMany)", async () => {
    const app = await makeApp();
    const res = await app.request("/api/taux-tva", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libelle: "Reduit", taux: 5.5, defaut: true, dateEffet: "2026-01-01" }),
    });
    expect(res.status).toBe(201);
  });

  it("creates without defaut", async () => {
    const app = await makeApp();
    const res = await app.request("/api/taux-tva", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libelle: "Reduit", taux: 5.5 }),
    });
    expect(res.status).toBe(201);
  });

  it("422 invalid taux", async () => {
    const app = await makeApp();
    const res = await app.request("/api/taux-tva", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libelle: "X", taux: 200 }),
    });
    expect(res.status).toBe(422);
  });

  it("403 for VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/taux-tva", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libelle: "X", taux: 5 }),
    });
    expect(res.status).toBe(403);
  });
});

describe("PUT /api/taux-tva/:id", () => {
  it("updates with defaut=true", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_TVA);
    const app = await makeApp();
    const res = await app.request("/api/taux-tva/tva-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libelle: "Renamed", defaut: true }),
    });
    expect(res.status).toBe(200);
  });

  it("updates without defaut", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_TVA);
    const app = await makeApp();
    const res = await app.request("/api/taux-tva/tva-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libelle: "Renamed" }),
    });
    expect(res.status).toBe(200);
  });

  it("404 when not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/taux-tva/missing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libelle: "X" }),
    });
    expect(res.status).toBe(404);
  });

  it("422 invalid body", async () => {
    const app = await makeApp();
    const res = await app.request("/api/taux-tva/tva-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taux: -1 }),
    });
    expect(res.status).toBe(422);
  });
});

describe("PATCH /api/taux-tva/:id/toggle", () => {
  it("toggles actif", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_TVA);
    mockUpdate.mockResolvedValueOnce({ ...MOCK_TVA, actif: false });
    const app = await makeApp();
    const res = await app.request("/api/taux-tva/tva-1/toggle", { method: "PATCH" });
    expect(res.status).toBe(200);
  });

  it("404 when not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/taux-tva/missing/toggle", { method: "PATCH" });
    expect(res.status).toBe(404);
  });
});
