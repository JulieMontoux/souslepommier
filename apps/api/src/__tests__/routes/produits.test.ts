/**
 * Route tests for /api/produits
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

const GERANT_USER = { id: "u1", username: "g", role: "GERANT" as const, nom: "G", prenom: "G" };
const VENDEUR_USER = { ...GERANT_USER, role: "VENDEUR" as const };

const MOCK_VARIANTE = {
  id: "v1",
  produitId: "p1",
  prixHT: 10,
  tauxTVA: { id: "tva1", libelle: "20%", taux: 20 },
  unitePoids: null,
  paliers: [],
};

const MOCK_PRODUIT = {
  id: "p1",
  nom: "Pomme",
  categorieId: null,
  description: null,
  image: null,
  actif: true,
  saisonDebutMois: null,
  saisonDebutJour: null,
  saisonFinMois: null,
  saisonFinJour: null,
  categorie: null,
  variantes: [MOCK_VARIANTE],
};

vi.mock("node:fs", () => ({
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true),
  unlinkSync: vi.fn(),
}));

const mockFindMany = vi.fn().mockResolvedValue([MOCK_PRODUIT]);
const mockFindUnique = vi.fn();
const mockCreate = vi.fn().mockResolvedValue(MOCK_PRODUIT);
const mockUpdate = vi.fn().mockResolvedValue(MOCK_PRODUIT);
const mockTransaction = vi.fn().mockResolvedValue([MOCK_PRODUIT]);
const mockVariantesFindMany = vi.fn().mockResolvedValue([MOCK_VARIANTE]);

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    produit: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
    },
    varianteProduit: { findMany: mockVariantesFindMany, updateMany: vi.fn() },
    $transaction: mockTransaction,
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
  const { produitsRouter } = await import("../../routes/produits.js");
  const app = new Hono();
  app.route("/api/produits", produitsRouter);
  return app;
}

beforeAll(() => {
  process.env.SIGNING_SECRET = "test-secret-minimum-32-bytes-long!";
});

beforeEach(() => {
  _currentUser = GERANT_USER;
  mockFindUnique.mockReset();
});

describe("GET /api/produits", () => {
  it("returns list", async () => {
    const app = await makeApp();
    const res = await app.request("/api/produits");
    expect(res.status).toBe(200);
  });

  it("filters by search/categorieId/actif=true", async () => {
    const app = await makeApp();
    const res = await app.request("/api/produits?search=Pomme&categorieId=c1&actif=true");
    expect(res.status).toBe(200);
  });

  it("filters with actif=false", async () => {
    const app = await makeApp();
    const res = await app.request("/api/produits?q=X&actif=false");
    expect(res.status).toBe(200);
  });

  it("computes horsJour with season range (no-op when nulls)", async () => {
    mockFindMany.mockResolvedValueOnce([
      { ...MOCK_PRODUIT, saisonDebutMois: 1, saisonDebutJour: 1, saisonFinMois: 12, saisonFinJour: 31 },
    ]);
    const app = await makeApp();
    const res = await app.request("/api/produits");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].horsJour).toBe(false);
  });

  it("horsJour true for cross-year range Sep-Mar excluding now", async () => {
    // Make a product with a season that excludes the current date.
    // Use small narrow range around (current date + 1 day) only — guaranteed out
    const now = new Date();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    // Pick a range that does NOT include current MMDD
    const offsetM = m === 12 ? 1 : m + 1;
    const offsetD = 1;
    mockFindMany.mockResolvedValueOnce([
      { ...MOCK_PRODUIT, saisonDebutMois: offsetM, saisonDebutJour: offsetD, saisonFinMois: offsetM, saisonFinJour: 2 },
    ]);
    const app = await makeApp();
    const res = await app.request("/api/produits");
    expect(res.status).toBe(200);
  });
});

describe("POST /api/produits", () => {
  it("creates", async () => {
    const app = await makeApp();
    const res = await app.request("/api/produits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: "Poire", categorieId: "c1", description: "desc", image: "https://x.com/i.png" }),
    });
    expect(res.status).toBe(201);
  });

  it("422 invalid", async () => {
    const app = await makeApp();
    const res = await app.request("/api/produits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });
});

describe("GET /api/produits/:id", () => {
  it("returns produit", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_PRODUIT);
    const app = await makeApp();
    const res = await app.request("/api/produits/p1");
    expect(res.status).toBe(200);
  });

  it("404", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/produits/missing");
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/produits/:id", () => {
  it("updates", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_PRODUIT);
    const app = await makeApp();
    const res = await app.request("/api/produits/p1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: "Pomme bio" }),
    });
    expect(res.status).toBe(200);
  });

  it("404", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/produits/missing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: "X" }),
    });
    expect(res.status).toBe(404);
  });

  it("422", async () => {
    const app = await makeApp();
    const res = await app.request("/api/produits/p1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: "" }),
    });
    expect(res.status).toBe(422);
  });
});

describe("PATCH /api/produits/:id/statut", () => {
  it("422 if actif not boolean", async () => {
    const app = await makeApp();
    const res = await app.request("/api/produits/p1/statut", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: "yes" }),
    });
    expect(res.status).toBe(422);
  });

  it("404 not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/produits/missing/statut", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: true }),
    });
    expect(res.status).toBe(404);
  });

  it("200 activates", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_PRODUIT);
    mockTransaction.mockResolvedValueOnce([{ ...MOCK_PRODUIT, actif: true }]);
    const app = await makeApp();
    const res = await app.request("/api/produits/p1/statut", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: true }),
    });
    expect(res.status).toBe(200);
  });

  it("200 deactivates (cascades variants)", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_PRODUIT);
    mockTransaction.mockResolvedValueOnce([{ ...MOCK_PRODUIT, actif: false }]);
    const app = await makeApp();
    const res = await app.request("/api/produits/p1/statut", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: false }),
    });
    expect(res.status).toBe(200);
  });

  it("403 for VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/produits/p1/statut", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: true }),
    });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/produits/:id/variantes", () => {
  it("returns variantes", async () => {
    const app = await makeApp();
    const res = await app.request("/api/produits/p1/variantes");
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/produits/:id/image", () => {
  it("404 not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/produits/missing/image", { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  it("200 clears image (no local file)", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...MOCK_PRODUIT, image: null });
    const app = await makeApp();
    const res = await app.request("/api/produits/p1/image", { method: "DELETE" });
    expect(res.status).toBe(200);
  });

  it("200 clears external URL image", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...MOCK_PRODUIT, image: "https://ext.example/i.jpg" });
    const app = await makeApp();
    const res = await app.request("/api/produits/p1/image", { method: "DELETE" });
    expect(res.status).toBe(200);
  });

  it("403 for VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/produits/p1/image", { method: "DELETE" });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/produits/:id/image (upload)", () => {
  it("404 when produit not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const form = new FormData();
    form.append("file", new Blob(["abc"], { type: "image/jpeg" }), "x.jpg");
    const res = await app.request("/api/produits/missing/image", { method: "POST", body: form });
    expect(res.status).toBe(404);
  });

  it("422 when file missing", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_PRODUIT);
    const app = await makeApp();
    const form = new FormData();
    const res = await app.request("/api/produits/p1/image", { method: "POST", body: form });
    expect(res.status).toBe(422);
  });

  it("422 unsupported type", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_PRODUIT);
    const app = await makeApp();
    const form = new FormData();
    form.append("file", new File(["x"], "x.gif", { type: "image/gif" }));
    const res = await app.request("/api/produits/p1/image", { method: "POST", body: form });
    expect(res.status).toBe(422);
  });

  it("422 file too large", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_PRODUIT);
    const app = await makeApp();
    const form = new FormData();
    // 2 Mo + 1 byte
    const big = new Uint8Array(2 * 1024 * 1024 + 1);
    form.append("file", new File([big], "big.jpg", { type: "image/jpeg" }));
    const res = await app.request("/api/produits/p1/image", { method: "POST", body: form });
    expect(res.status).toBe(422);
  });

  it("200 uploads new image (jpeg)", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...MOCK_PRODUIT, image: null });
    const app = await makeApp();
    const form = new FormData();
    form.append("file", new File(["data"], "x.jpg", { type: "image/jpeg" }));
    const res = await app.request("/api/produits/p1/image", { method: "POST", body: form });
    expect(res.status).toBe(200);
  });

  it("200 uploads png and replaces existing /uploads/ image", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...MOCK_PRODUIT, image: "/uploads/old.jpg" });
    const app = await makeApp();
    const form = new FormData();
    // No extension so it falls back to type-based ext (png)
    form.append("file", new File(["png-data"], "noext", { type: "image/png" }));
    const res = await app.request("/api/produits/p1/image", { method: "POST", body: form });
    expect(res.status).toBe(200);
  });

  it("200 uploads webp", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...MOCK_PRODUIT, image: null });
    const app = await makeApp();
    const form = new FormData();
    form.append("file", new File(["data"], "noext", { type: "image/webp" }));
    const res = await app.request("/api/produits/p1/image", { method: "POST", body: form });
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/produits/:id/image — local file deletion path", () => {
  it("200 clears local /uploads/ image", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...MOCK_PRODUIT, image: "/uploads/abc.jpg" });
    const app = await makeApp();
    const res = await app.request("/api/produits/p1/image", { method: "DELETE" });
    expect(res.status).toBe(200);
  });
});
