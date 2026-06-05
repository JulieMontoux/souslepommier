/**
 * Route tests for /api/abonnements
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

const GERANT_USER = { id: "u1", username: "g", role: "GERANT" as const, nom: "G", prenom: "G" };
const VENDEUR_USER = { ...GERANT_USER, role: "VENDEUR" as const };

const MOCK_ABO = {
  id: "ab-1",
  clientId: "c1",
  nom: "Hebdo",
  frequence: "HEBDO",
  actif: true,
  createdAt: new Date(),
  client: { id: "c1", raisonSociale: "ACME" },
  lignes: [{ id: "l1", varianteProduitId: "v1", qte: 2 }],
  livraisons: [],
  _count: { livraisons: 0 },
};

const MOCK_LIVRAISON = {
  id: "liv-1",
  abonnementId: "ab-1",
  date: new Date(),
  statut: "PLANIFIEE",
  venteId: null,
  abonnement: {
    ...MOCK_ABO,
    lignes: [{ varianteProduitId: "v1", qte: 2 }],
  },
};

const mockAboFindMany = vi.fn().mockResolvedValue([MOCK_ABO]);
const mockAboFindUnique = vi.fn();
const mockAboCreate = vi.fn().mockResolvedValue(MOCK_ABO);
const mockAboUpdate = vi.fn().mockResolvedValue(MOCK_ABO);
const mockLivFindMany = vi.fn().mockResolvedValue([]);
const mockLivFindUnique = vi.fn();
const mockLivCreate = vi.fn().mockResolvedValue(MOCK_LIVRAISON);
const mockLivUpdate = vi.fn().mockResolvedValue(MOCK_LIVRAISON);
const mockVariantesFindMany = vi.fn().mockResolvedValue([
  { id: "v1", prixHT: 10, tauxTVA: { taux: 20 } },
]);
const mockTransaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
  fn({
    ligneAbonnement: { deleteMany: vi.fn() },
    abonnement: { update: vi.fn().mockResolvedValue(MOCK_ABO) },
  }),
);
const mockCreateVente = vi.fn().mockResolvedValue({ id: "vente-1", numeroTicket: "T1" });

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    abonnement: {
      findMany: mockAboFindMany,
      findUnique: mockAboFindUnique,
      create: mockAboCreate,
      update: mockAboUpdate,
    },
    livraison: {
      findMany: mockLivFindMany,
      findUnique: mockLivFindUnique,
      create: mockLivCreate,
      update: mockLivUpdate,
    },
    varianteProduit: { findMany: mockVariantesFindMany },
    $transaction: mockTransaction,
  },
}));

vi.mock("../../lib/audit.js", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../lib/create-vente.js", () => ({
  createVente: mockCreateVente,
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
  const { abonnementsRouter } = await import("../../routes/abonnements.js");
  const app = new Hono();
  app.route("/api/abonnements", abonnementsRouter);
  return app;
}

beforeAll(() => {
  process.env.SIGNING_SECRET = "test-secret-minimum-32-bytes-long!";
});

beforeEach(() => {
  _currentUser = GERANT_USER;
  mockAboFindUnique.mockReset();
  mockLivFindUnique.mockReset();
  mockCreateVente.mockReset();
  mockCreateVente.mockResolvedValue({ id: "vente-1", numeroTicket: "T1" });
});

describe("GET /api/abonnements", () => {
  it("200 list", async () => {
    const app = await makeApp();
    const res = await app.request("/api/abonnements");
    expect(res.status).toBe(200);
  });

  it("200 with filters", async () => {
    const app = await makeApp();
    const res = await app.request("/api/abonnements?clientId=c1&actif=true");
    expect(res.status).toBe(200);
  });

  it("403 VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/abonnements");
    expect(res.status).toBe(403);
  });
});

describe("GET /api/abonnements/:id", () => {
  it("404", async () => {
    mockAboFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/abonnements/missing");
    expect(res.status).toBe(404);
  });

  it("200", async () => {
    mockAboFindUnique.mockResolvedValueOnce(MOCK_ABO);
    const app = await makeApp();
    const res = await app.request("/api/abonnements/ab-1");
    expect(res.status).toBe(200);
  });
});

describe("POST /api/abonnements", () => {
  const VALID = {
    clientId: "c1",
    nom: "Hebdo",
    frequence: "HEBDO",
    lignes: [{ varianteProduitId: "v1", qte: 2 }],
  };

  it("422 invalid", async () => {
    const app = await makeApp();
    const res = await app.request("/api/abonnements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });

  it("201", async () => {
    const app = await makeApp();
    const res = await app.request("/api/abonnements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID),
    });
    expect(res.status).toBe(201);
  });
});

describe("PUT /api/abonnements/:id", () => {
  const VALID = {
    clientId: "c1",
    nom: "Hebdo updated",
    frequence: "HEBDO",
    lignes: [{ varianteProduitId: "v1", qte: 3 }],
  };

  it("422 invalid", async () => {
    const app = await makeApp();
    const res = await app.request("/api/abonnements/ab-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });

  it("404 not found", async () => {
    mockAboFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/abonnements/missing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID),
    });
    expect(res.status).toBe(404);
  });

  it("200 updates", async () => {
    mockAboFindUnique.mockResolvedValueOnce(MOCK_ABO);
    const app = await makeApp();
    const res = await app.request("/api/abonnements/ab-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID),
    });
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/abonnements/:id/actif", () => {
  it("422 invalid", async () => {
    const app = await makeApp();
    const res = await app.request("/api/abonnements/ab-1/actif", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });

  it("404 not found", async () => {
    mockAboFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/abonnements/missing/actif", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: false }),
    });
    expect(res.status).toBe(404);
  });

  it("200", async () => {
    mockAboFindUnique.mockResolvedValueOnce(MOCK_ABO);
    const app = await makeApp();
    const res = await app.request("/api/abonnements/ab-1/actif", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: false }),
    });
    expect(res.status).toBe(200);
  });
});

describe("GET /api/abonnements/:id/livraisons", () => {
  it("200", async () => {
    const app = await makeApp();
    const res = await app.request("/api/abonnements/ab-1/livraisons");
    expect(res.status).toBe(200);
  });
});

describe("GET /api/abonnements/livraisons/calendrier", () => {
  it("200", async () => {
    const app = await makeApp();
    const res = await app.request("/api/abonnements/livraisons/calendrier");
    expect(res.status).toBe(200);
  });
});

describe("POST /api/abonnements/:id/livraisons", () => {
  it("422 invalid date", async () => {
    const app = await makeApp();
    const res = await app.request("/api/abonnements/ab-1/livraisons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "invalid" }),
    });
    expect(res.status).toBe(422);
  });

  it("404 abonnement not found", async () => {
    mockAboFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/abonnements/missing/livraisons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "2026-01-15" }),
    });
    expect(res.status).toBe(404);
  });

  it("409 abonnement inactif", async () => {
    mockAboFindUnique.mockResolvedValueOnce({ ...MOCK_ABO, actif: false });
    const app = await makeApp();
    const res = await app.request("/api/abonnements/ab-1/livraisons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "2026-01-15" }),
    });
    expect(res.status).toBe(409);
  });

  it("201", async () => {
    mockAboFindUnique.mockResolvedValueOnce(MOCK_ABO);
    const app = await makeApp();
    const res = await app.request("/api/abonnements/ab-1/livraisons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "2026-01-15" }),
    });
    expect(res.status).toBe(201);
  });
});

describe("POST /api/abonnements/livraisons/:livraisonId/livrer", () => {
  it("422 invalid body", async () => {
    const app = await makeApp();
    const res = await app.request("/api/abonnements/livraisons/liv-1/livrer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ montant: -1 }),
    });
    expect(res.status).toBe(422);
  });

  it("404 livraison not found", async () => {
    mockLivFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/abonnements/livraisons/missing/livrer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(404);
  });

  it("409 already processed", async () => {
    mockLivFindUnique.mockResolvedValueOnce({ ...MOCK_LIVRAISON, statut: "LIVREE" });
    const app = await makeApp();
    const res = await app.request("/api/abonnements/livraisons/liv-1/livrer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(409);
  });

  it("200 default paiement", async () => {
    mockLivFindUnique.mockResolvedValueOnce(MOCK_LIVRAISON);
    const app = await makeApp();
    const res = await app.request("/api/abonnements/livraisons/liv-1/livrer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
  });

  it("200 with custom paiement", async () => {
    mockLivFindUnique.mockResolvedValueOnce(MOCK_LIVRAISON);
    const app = await makeApp();
    const res = await app.request("/api/abonnements/livraisons/liv-1/livrer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modePaiement: "CB", montant: 50 }),
    });
    expect(res.status).toBe(200);
  });

  it("200 when variante missing for line (skipped in total)", async () => {
    mockLivFindUnique.mockResolvedValueOnce(MOCK_LIVRAISON);
    mockVariantesFindMany.mockResolvedValueOnce([]);
    const app = await makeApp();
    const res = await app.request("/api/abonnements/livraisons/liv-1/livrer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
  });
});

describe("POST /api/abonnements/livraisons/:livraisonId/annuler", () => {
  it("404 not found", async () => {
    mockLivFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/abonnements/livraisons/missing/annuler", {
      method: "POST",
    });
    expect(res.status).toBe(404);
  });

  it("409 not planifiee", async () => {
    mockLivFindUnique.mockResolvedValueOnce({ ...MOCK_LIVRAISON, statut: "LIVREE" });
    const app = await makeApp();
    const res = await app.request("/api/abonnements/livraisons/liv-1/annuler", {
      method: "POST",
    });
    expect(res.status).toBe(409);
  });

  it("200", async () => {
    mockLivFindUnique.mockResolvedValueOnce(MOCK_LIVRAISON);
    const app = await makeApp();
    const res = await app.request("/api/abonnements/livraisons/liv-1/annuler", {
      method: "POST",
    });
    expect(res.status).toBe(200);
  });
});
