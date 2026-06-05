/**
 * Route tests for /api/rgpd
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

const GERANT_USER = { id: "u1", username: "g", role: "GERANT" as const, nom: "G", prenom: "G" };
const VENDEUR_USER = { ...GERANT_USER, role: "VENDEUR" as const };

const MOCK_DEMANDE = {
  id: "d1",
  type: "ACCES",
  nom: "Dupont",
  email: "client@example.com",
  message: null,
  statut: "EN_ATTENTE",
  reponse: null,
  traiteAt: null,
  createdAt: new Date(),
};

const MOCK_USER = {
  id: "u9",
  email: "x@y.com",
  prenom: "P",
  nom: "N",
  createdAt: new Date(),
  lastLoginAt: new Date(),
};

const mockDemandeFindMany = vi.fn().mockResolvedValue([MOCK_DEMANDE]);
const mockDemandeFindUnique = vi.fn();
const mockDemandeCreate = vi.fn().mockResolvedValue(MOCK_DEMANDE);
const mockDemandeUpdate = vi.fn().mockResolvedValue(MOCK_DEMANDE);
const mockUserFindUnique = vi.fn();
const mockVenteFindMany = vi.fn().mockResolvedValue([]);
const mockJournalFindMany = vi.fn().mockResolvedValue([]);

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    demandeRGPD: {
      findMany: mockDemandeFindMany,
      findUnique: mockDemandeFindUnique,
      create: mockDemandeCreate,
      update: mockDemandeUpdate,
    },
    user: { findUnique: mockUserFindUnique },
    vente: { findMany: mockVenteFindMany },
    journalAudit: { findMany: mockJournalFindMany },
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
  const { rgpdRouter } = await import("../../routes/rgpd.js");
  const app = new Hono();
  app.route("/api/rgpd", rgpdRouter);
  return app;
}

beforeAll(() => {
  process.env.SIGNING_SECRET = "test-secret-minimum-32-bytes-long!";
});

beforeEach(() => {
  _currentUser = GERANT_USER;
});

describe("GET /api/rgpd/demandes", () => {
  it("200 for GERANT", async () => {
    const app = await makeApp();
    const res = await app.request("/api/rgpd/demandes");
    expect(res.status).toBe(200);
  });

  it("403 for VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/rgpd/demandes");
    expect(res.status).toBe(403);
  });
});

describe("POST /api/rgpd/demandes", () => {
  it("creates demande (public)", async () => {
    const app = await makeApp();
    const res = await app.request("/api/rgpd/demandes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ACCES", nom: "Dupont", email: "a@b.com", message: "hi" }),
    });
    expect(res.status).toBe(201);
  });

  it("422 invalid email", async () => {
    const app = await makeApp();
    const res = await app.request("/api/rgpd/demandes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ACCES", nom: "X", email: "not-email" }),
    });
    expect(res.status).toBe(422);
  });

  it("422 invalid type", async () => {
    const app = await makeApp();
    const res = await app.request("/api/rgpd/demandes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "FOO", nom: "X", email: "a@b.com" }),
    });
    expect(res.status).toBe(422);
  });
});

describe("PATCH /api/rgpd/demandes/:id", () => {
  it("updates statut", async () => {
    mockDemandeFindUnique.mockResolvedValueOnce(MOCK_DEMANDE);
    const app = await makeApp();
    const res = await app.request("/api/rgpd/demandes/d1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "TRAITEE", reponse: "OK" }),
    });
    expect(res.status).toBe(200);
  });

  it("404 when not found", async () => {
    mockDemandeFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/rgpd/demandes/missing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "TRAITEE" }),
    });
    expect(res.status).toBe(404);
  });

  it("422 invalid statut", async () => {
    const app = await makeApp();
    const res = await app.request("/api/rgpd/demandes/d1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "XYZ" }),
    });
    expect(res.status).toBe(422);
  });

  it("403 for VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/rgpd/demandes/d1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "TRAITEE" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/rgpd/export/:userId", () => {
  it("exports user data", async () => {
    mockUserFindUnique.mockResolvedValueOnce(MOCK_USER);
    const app = await makeApp();
    const res = await app.request("/api/rgpd/export/u9");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeDefined();
  });

  it("handles user with no lastLoginAt", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ ...MOCK_USER, lastLoginAt: null });
    const app = await makeApp();
    const res = await app.request("/api/rgpd/export/u9");
    expect(res.status).toBe(200);
  });

  it("exports with ventes/audit populated", async () => {
    mockUserFindUnique.mockResolvedValueOnce(MOCK_USER);
    mockVenteFindMany.mockResolvedValueOnce([
      { id: "v1", numeroTicket: "T1", date: new Date(), totalTTC: 50, statut: "FINALISEE" },
    ]);
    const app = await makeApp();
    const res = await app.request("/api/rgpd/export/u9");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ventes).toHaveLength(1);
  });

  it("404 user not found", async () => {
    mockUserFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/rgpd/export/missing");
    expect(res.status).toBe(404);
  });

  it("403 for VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/rgpd/export/u9");
    expect(res.status).toBe(403);
  });
});
