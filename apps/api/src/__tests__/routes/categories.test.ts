/**
 * Route tests for /api/categories
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

const GERANT_USER = {
  id: "u1",
  username: "gerant",
  role: "GERANT" as const,
  nom: "G",
  prenom: "G",
};
const VENDEUR_USER = { ...GERANT_USER, role: "VENDEUR" as const };

const MOCK_CAT = { id: "cat-1", nom: "Fruits" };

const mockFindMany = vi.fn().mockResolvedValue([MOCK_CAT]);
const mockFindUnique = vi.fn();
const mockUpsert = vi.fn().mockResolvedValue(MOCK_CAT);
const mockUpdate = vi.fn().mockResolvedValue(MOCK_CAT);
const mockDelete = vi.fn().mockResolvedValue(MOCK_CAT);
const mockProduitCount = vi.fn().mockResolvedValue(0);

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    categorie: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      upsert: mockUpsert,
      update: mockUpdate,
      delete: mockDelete,
    },
    produit: { count: mockProduitCount },
  },
}));

vi.mock("../../lib/audit.js", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

let _currentUser: { role: string; id: string; username: string; nom: string; prenom: string } =
  GERANT_USER;

vi.mock("../../lib/middleware.js", () => ({
  authMiddleware: vi.fn(
    async (
      c: { set: (k: string, v: unknown) => void },
      next: () => Promise<void>,
    ) => {
      c.set("user", _currentUser);
      await next();
    },
  ),
  requireRole: (..._roles: string[]) =>
    vi.fn(
      async (
        c: { set: (k: string, v: unknown) => void },
        next: () => Promise<void>,
      ) => {
        c.set("user", _currentUser);
        const role = _currentUser.role;
        if (role !== "SUPERADMIN" && !_roles.includes(role)) {
          return new Response(JSON.stringify({ error: "Accès refusé" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
        await next();
      },
    ),
  HonoEnv: {},
}));

async function makeApp() {
  const { categoriesRouter } = await import("../../routes/categories.js");
  const app = new Hono();
  app.route("/api/categories", categoriesRouter);
  return app;
}

beforeAll(() => {
  process.env.SIGNING_SECRET = "test-secret-minimum-32-bytes-long!";
});

beforeEach(() => {
  _currentUser = GERANT_USER;
});

describe("GET /api/categories", () => {
  it("returns list", async () => {
    const app = await makeApp();
    const res = await app.request("/api/categories");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("POST /api/categories", () => {
  it("creates with valid payload", async () => {
    const app = await makeApp();
    const res = await app.request("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: "Légumes" }),
    });
    expect(res.status).toBe(201);
  });

  it("422 when nom missing", async () => {
    const app = await makeApp();
    const res = await app.request("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });

  it("422 on malformed body", async () => {
    const app = await makeApp();
    const res = await app.request("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "x",
    });
    expect(res.status).toBe(422);
  });

  it("403 for VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: "X" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("PUT /api/categories/:id", () => {
  it("updates when category exists", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_CAT);
    const app = await makeApp();
    const res = await app.request("/api/categories/cat-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: "Renamed" }),
    });
    expect(res.status).toBe(200);
  });

  it("404 when not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/categories/missing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: "X" }),
    });
    expect(res.status).toBe(404);
  });

  it("422 invalid body", async () => {
    const app = await makeApp();
    const res = await app.request("/api/categories/cat-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: "" }),
    });
    expect(res.status).toBe(422);
  });
});

describe("DELETE /api/categories/:id", () => {
  it("204 when deletable", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_CAT);
    mockProduitCount.mockResolvedValueOnce(0);
    const app = await makeApp();
    const res = await app.request("/api/categories/cat-1", { method: "DELETE" });
    expect(res.status).toBe(204);
  });

  it("404 when category not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/categories/missing", { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  it("409 when category used by products", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_CAT);
    mockProduitCount.mockResolvedValueOnce(3);
    const app = await makeApp();
    const res = await app.request("/api/categories/cat-1", { method: "DELETE" });
    expect(res.status).toBe(409);
  });
});
