/**
 * Route tests for /api/ventes
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

const GERANT_USER = { id: "u1", username: "g", role: "GERANT" as const, nom: "G", prenom: "G" };
const VENDEUR_USER = { ...GERANT_USER, role: "VENDEUR" as const };

const MOCK_VENTE = {
  id: "vente-1",
  numeroTicket: "T0001",
  date: new Date("2026-01-15T10:00:00Z"),
  totalHT: 100,
  totalTVA: 20,
  totalTTC: 120,
  statut: "FINALISEE",
  motifAnnulation: null,
  vendeurId: "u1",
  vendeur: { id: "u1", prenom: "P", nom: "N" },
  paiements: [{ mode: "CB", montant: 120, renduMonnaie: 0, reference: "" }],
  client: null,
  lignes: [
    {
      qte: 1,
      prixUnitaireHT: 100,
      tauxTVA: 20,
      remise: 0,
      montantHT: 100,
      montantTVA: 20,
      montantTTC: 120,
      variante: { produit: { id: "p1", nom: "Pomme" } },
    },
  ],
  _count: { lignes: 1 },
};

const mockFindMany = vi.fn().mockResolvedValue([MOCK_VENTE]);
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn().mockResolvedValue(MOCK_VENTE);
const mockCount = vi.fn().mockResolvedValue(1);
const mockConfigFindUnique = vi.fn().mockResolvedValue(null);
const mockClotureFindFirst = vi.fn();
const mockCreateVente = vi.fn().mockResolvedValue(MOCK_VENTE);

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    vente: { findMany: mockFindMany, findUnique: mockFindUnique, update: mockUpdate, count: mockCount },
    clotureCaisse: { findFirst: mockClotureFindFirst },
    configEntreprise: { findUnique: mockConfigFindUnique },
  },
}));

vi.mock("../../lib/audit.js", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../lib/create-vente.js", () => ({
  createVente: mockCreateVente,
}));

vi.mock("../../pdf/ticket-pdf.js", () => ({
  TicketDocument: () => null,
}));

vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from("%PDF-fake")),
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
  const { ventesRouter } = await import("../../routes/ventes.js");
  const app = new Hono();
  app.route("/api/ventes", ventesRouter);
  return app;
}

beforeAll(() => {
  process.env.SIGNING_SECRET = "test-secret-minimum-32-bytes-long!";
});

beforeEach(() => {
  _currentUser = GERANT_USER;
  mockFindUnique.mockReset();
  mockClotureFindFirst.mockReset();
  mockCreateVente.mockReset();
  mockCreateVente.mockResolvedValue(MOCK_VENTE);
});

describe("GET /api/ventes", () => {
  it("200 with default", async () => {
    const app = await makeApp();
    const res = await app.request("/api/ventes");
    expect(res.status).toBe(200);
  });

  it("200 with filters", async () => {
    const app = await makeApp();
    const res = await app.request("/api/ventes?from=2026-01-01&to=2026-12-31&vendeurId=u1&statut=FINALISEE&pointDeVenteId=pdv1&page=2&limit=10");
    expect(res.status).toBe(200);
  });
});

describe("POST /api/ventes", () => {
  const VALID = {
    lignes: [{ varianteProduitId: "v1", qte: 1 }],
    paiements: [{ mode: "CB", montant: 10 }],
  };

  it("422 invalid", async () => {
    const app = await makeApp();
    const res = await app.request("/api/ventes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });

  it("201 success", async () => {
    const app = await makeApp();
    const res = await app.request("/api/ventes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID, pointDeVenteId: "pdv1", clientId: "c1" }),
    });
    expect(res.status).toBe(201);
  });

  it("propagates error status from createVente", async () => {
    mockCreateVente.mockRejectedValueOnce({ status: 404, message: "Variante introuvable" });
    const app = await makeApp();
    const res = await app.request("/api/ventes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID),
    });
    expect(res.status).toBe(404);
  });

  it("500 when createVente throws non-structured error", async () => {
    mockCreateVente.mockRejectedValueOnce(new Error("boom"));
    const app = await makeApp();
    const res = await app.request("/api/ventes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID),
    });
    expect(res.status).toBe(500);
  });
});

describe("POST /api/ventes/manuel", () => {
  const VALID = {
    date: "2026-01-15",
    lignes: [{ varianteProduitId: "v1", qte: 1 }],
    paiements: [{ mode: "CB", montant: 10 }],
  };

  it("422 invalid", async () => {
    const app = await makeApp();
    const res = await app.request("/api/ventes/manuel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });

  it("201 success", async () => {
    const app = await makeApp();
    const res = await app.request("/api/ventes/manuel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID),
    });
    expect(res.status).toBe(201);
  });

  it("propagates createVente error", async () => {
    mockCreateVente.mockRejectedValueOnce({ status: 404, message: "no" });
    const app = await makeApp();
    const res = await app.request("/api/ventes/manuel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID),
    });
    expect(res.status).toBe(404);
  });

  it("403 for VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/ventes/manuel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID),
    });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/ventes/today", () => {
  it("200", async () => {
    const app = await makeApp();
    const res = await app.request("/api/ventes/today");
    expect(res.status).toBe(200);
  });
});

describe("GET /api/ventes/:id", () => {
  it("404", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/ventes/missing");
    expect(res.status).toBe(404);
  });

  it("200", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_VENTE);
    const app = await makeApp();
    const res = await app.request("/api/ventes/vente-1");
    expect(res.status).toBe(200);
  });
});

describe("GET /api/ventes/:id/ticket", () => {
  it("404", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/ventes/missing/ticket");
    expect(res.status).toBe(404);
  });

  it("returns PDF", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_VENTE);
    const app = await makeApp();
    const res = await app.request("/api/ventes/vente-1/ticket");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
  });

  it("returns PDF with config data", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_VENTE);
    mockConfigFindUnique.mockResolvedValueOnce({
      raisonSociale: "X",
      siret: null,
      tvaIntracommunautaire: null,
      adresse: null,
      codePostal: null,
      ville: null,
      telephone: null,
    });
    const app = await makeApp();
    const res = await app.request("/api/ventes/vente-1/ticket");
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/ventes/:id/client", () => {
  it("404 vente not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/ventes/missing/client", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: "c1" }),
    });
    expect(res.status).toBe(404);
  });

  it("409 not finalized", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...MOCK_VENTE, statut: "ANNULEE" });
    const app = await makeApp();
    const res = await app.request("/api/ventes/vente-1/client", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: "c1" }),
    });
    expect(res.status).toBe(409);
  });

  it("200 attach", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_VENTE);
    const app = await makeApp();
    const res = await app.request("/api/ventes/vente-1/client", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: "c1" }),
    });
    expect(res.status).toBe(200);
  });

  it("200 detach", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_VENTE);
    const app = await makeApp();
    const res = await app.request("/api/ventes/vente-1/client", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
  });

  it("403 for VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/ventes/vente-1/client", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: "c1" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/ventes/:id/annuler", () => {
  it("404 not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/ventes/missing/annuler", { method: "POST" });
    expect(res.status).toBe(404);
  });

  it("409 not finalized", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...MOCK_VENTE, statut: "ANNULEE" });
    const app = await makeApp();
    const res = await app.request("/api/ventes/vente-1/annuler", { method: "POST" });
    expect(res.status).toBe(409);
  });

  it("409 day already closed", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_VENTE);
    mockClotureFindFirst.mockResolvedValueOnce({ id: "cl1" });
    const app = await makeApp();
    const res = await app.request("/api/ventes/vente-1/annuler", { method: "POST" });
    expect(res.status).toBe(409);
  });

  it("200 cancel without motif", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_VENTE);
    mockClotureFindFirst.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/ventes/vente-1/annuler", { method: "POST" });
    expect(res.status).toBe(200);
  });

  it("200 cancel with motif", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_VENTE);
    mockClotureFindFirst.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/ventes/vente-1/annuler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motif: "erreur de caisse" }),
    });
    expect(res.status).toBe(200);
  });

  it("403 for VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/ventes/vente-1/annuler", { method: "POST" });
    expect(res.status).toBe(403);
  });
});
