/**
 * Route tests for /api/clients
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

const GERANT_USER = { id: "u1", username: "g", role: "GERANT" as const, nom: "G", prenom: "G" };
const VENDEUR_USER = { ...GERANT_USER, role: "VENDEUR" as const };

const MOCK_CLIENT = {
  id: "c1",
  raisonSociale: "ACME",
  siret: "73282932000074",
  tvaIntracommunautaire: null,
  adresse: null,
  codePostal: null,
  ville: null,
  pays: "FR",
  email: null,
  telephone: null,
  notes: null,
  conditionsPaiement: 30,
  formeJuridique: null,
  actif: true,
};

const mockFindMany = vi.fn().mockResolvedValue([MOCK_CLIENT]);
const mockFindUnique = vi.fn();
const mockCreate = vi.fn().mockResolvedValue(MOCK_CLIENT);
const mockUpdate = vi.fn().mockResolvedValue(MOCK_CLIENT);
const mockBlFindMany = vi.fn().mockResolvedValue([]);

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    client: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
    },
    bonLivraison: { findMany: mockBlFindMany },
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
  const { clientsRouter } = await import("../../routes/clients.js");
  const app = new Hono();
  app.route("/api/clients", clientsRouter);
  return app;
}

beforeAll(() => {
  process.env.SIGNING_SECRET = "test-secret-minimum-32-bytes-long!";
});

beforeEach(() => {
  _currentUser = GERANT_USER;
});

describe("GET /api/clients", () => {
  it("returns list", async () => {
    const app = await makeApp();
    const res = await app.request("/api/clients");
    expect(res.status).toBe(200);
  });

  it("filters by q and actif=true", async () => {
    const app = await makeApp();
    const res = await app.request("/api/clients?q=acme&actif=true");
    expect(res.status).toBe(200);
  });

  it("filters by actif=false", async () => {
    const app = await makeApp();
    const res = await app.request("/api/clients?actif=false");
    expect(res.status).toBe(200);
  });
});

describe("POST /api/clients", () => {
  it("creates with valid payload (no siret)", async () => {
    const app = await makeApp();
    const res = await app.request("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raisonSociale: "Newco" }),
    });
    expect(res.status).toBe(201);
  });

  it("creates with valid siret", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raisonSociale: "X", siret: "73282932000074" }),
    });
    expect(res.status).toBe(201);
  });

  it("422 invalid siret format", async () => {
    const app = await makeApp();
    const res = await app.request("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raisonSociale: "X", siret: "1234" }),
    });
    expect(res.status).toBe(422);
  });

  it("422 invalid luhn siret", async () => {
    const app = await makeApp();
    const res = await app.request("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raisonSociale: "X", siret: "12345678901234" }),
    });
    expect(res.status).toBe(422);
  });

  it("422 missing raisonSociale", async () => {
    const app = await makeApp();
    const res = await app.request("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });

  it("409 duplicate siret", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_CLIENT);
    const app = await makeApp();
    const res = await app.request("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raisonSociale: "X", siret: "73282932000074" }),
    });
    expect(res.status).toBe(409);
  });

  it("403 for VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raisonSociale: "X" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/clients/:id", () => {
  it("returns 200", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_CLIENT);
    const app = await makeApp();
    const res = await app.request("/api/clients/c1");
    expect(res.status).toBe(200);
  });

  it("404 when not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/clients/missing");
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/clients/:id", () => {
  it("updates", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_CLIENT);
    const app = await makeApp();
    const res = await app.request("/api/clients/c1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raisonSociale: "ACME Renamed" }),
    });
    expect(res.status).toBe(200);
  });

  it("404 not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/clients/missing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raisonSociale: "X" }),
    });
    expect(res.status).toBe(404);
  });

  it("422 invalid body", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_CLIENT);
    const app = await makeApp();
    const res = await app.request("/api/clients/c1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raisonSociale: "" }),
    });
    expect(res.status).toBe(422);
  });

  it("409 siret conflict on update", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_CLIENT); // existing
    mockFindUnique.mockResolvedValueOnce({ ...MOCK_CLIENT, id: "other" }); // conflict
    const app = await makeApp();
    const res = await app.request("/api/clients/c1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raisonSociale: "X", siret: "10000000000008" }),
    });
    expect(res.status).toBe(409);
  });

  it("403 for VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/clients/c1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raisonSociale: "X" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/clients/:id/bons-livraison", () => {
  it("returns list", async () => {
    const app = await makeApp();
    const res = await app.request("/api/clients/c1/bons-livraison");
    expect(res.status).toBe(200);
  });
});
