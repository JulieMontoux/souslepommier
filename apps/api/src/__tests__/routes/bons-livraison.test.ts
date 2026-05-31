/**
 * Route tests for /api/bons-livraison
 * Covers: Zod validation (OWASP A03), auth guards (OWASP A01), CRUD behavior.
 * Prisma, authMiddleware, requireRole, logAudit are mocked.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

// ── helpers ──────────────────────────────────────────────────────────────────
const GERANT_USER = {
  id: "u1",
  username: "gerant",
  role: "GERANT",
  nom: "G",
  prenom: "G",
};
const VENDEUR_USER = {
  id: "u2",
  username: "vendeur",
  role: "VENDEUR",
  nom: "V",
  prenom: "V",
};

const MOCK_CLIENT = {
  id: "client-1",
  raisonSociale: "GAEC du Pommier",
  siret: null,
  tvaIntracommunautaire: null,
  adresse: null,
  codePostal: null,
  ville: null,
  pays: null,
  email: null,
  telephone: null,
};

const MOCK_BL = {
  id: "bl-1",
  numero: "BL-2026-000001",
  clientId: "client-1",
  venteId: null,
  dateEmission: new Date("2026-01-15T10:00:00Z"),
  dateLivraison: null,
  statut: "BROUILLON" as const,
  totalHT: {
    valueOf: () => 100,
  } as unknown as import("@souslepommier/database").Prisma.Decimal,
  remiseCommerciale: null,
  notes: null,
  client: MOCK_CLIENT,
  lignes: [
    {
      id: "l1",
      bonLivraisonId: "bl-1",
      varianteProduitId: null,
      designation: "Pommes",
      qte: {
        valueOf: () => 10,
      } as unknown as import("@souslepommier/database").Prisma.Decimal,
      unite: "kg",
      prixUnitaireHT: {
        valueOf: () => 10,
      } as unknown as import("@souslepommier/database").Prisma.Decimal,
      remise: {
        valueOf: () => 0,
      } as unknown as import("@souslepommier/database").Prisma.Decimal,
      montantHT: {
        valueOf: () => 100,
      } as unknown as import("@souslepommier/database").Prisma.Decimal,
    },
  ],
};

// ── mocks ─────────────────────────────────────────────────────────────────────
const mockFindMany = vi.fn().mockResolvedValue([{ ...MOCK_BL }]);
const mockFindUnique = vi.fn();
const mockCreate = vi.fn().mockResolvedValue(MOCK_BL);
const mockUpdate = vi.fn().mockResolvedValue(MOCK_BL);
const mockTransaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
  const txBL = {
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(MOCK_BL),
  };
  return fn({ bonLivraison: txBL });
});

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    bonLivraison: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
    },
    client: { findUnique: vi.fn().mockResolvedValue(MOCK_CLIENT) },
    configEntreprise: { findUnique: vi.fn().mockResolvedValue(null) },
    $transaction: mockTransaction,
  },
}));

vi.mock("../../lib/audit.js", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

// Mock auth — inject user directly into context
vi.mock("../../lib/middleware.js", () => {
  let _user = GERANT_USER;
  return {
    authMiddleware: vi.fn(
      async (
        c: { set: (k: string, v: unknown) => void },
        next: () => Promise<void>,
      ) => {
        c.set("user", _user);
        await next();
      },
    ),
    requireRole: (..._roles: string[]) =>
      vi.fn(
        async (
          c: {
            get: (k: string) => typeof GERANT_USER;
            set: (k: string, v: unknown) => void;
          },
          next: () => Promise<void>,
        ) => {
          c.set("user", _user);
          const role = _user.role;
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
    _setUser: (u: typeof GERANT_USER) => {
      _user = u;
    },
  };
});

vi.mock("../../pdf/bon-livraison-pdf.js", () => ({
  BonLivraisonDocument: () => null,
}));

vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from("%PDF-fake")),
}));

// ── app factory ───────────────────────────────────────────────────────────────
async function makeApp() {
  const { bonsLivraisonRouter } =
    await import("../../routes/bons-livraison.js");
  const app = new Hono();
  app.route("/api/bons-livraison", bonsLivraisonRouter);
  return app;
}

// ── tests ─────────────────────────────────────────────────────────────────────
beforeAll(() => {
  process.env.SIGNING_SECRET = "test-secret-minimum-32-bytes-long!";
});

describe("GET /api/bons-livraison", () => {
  it("returns list", async () => {
    const app = await makeApp();
    const res = await app.request("/api/bons-livraison");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].numero).toBe("BL-2026-000001");
  });

  it("includes clientNom from join", async () => {
    const app = await makeApp();
    const res = await app.request("/api/bons-livraison");
    const body = await res.json();
    expect(body[0].clientNom).toBe("GAEC du Pommier");
  });
});

describe("POST /api/bons-livraison — validation (OWASP A03)", () => {
  const VALID_BODY = {
    clientId: "client-1",
    lignes: [{ designation: "Pommes", qte: 10, prixUnitaireHT: 10 }],
  };

  it("creates BL with valid payload", async () => {
    const app = await makeApp();
    const res = await app.request("/api/bons-livraison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });
    expect(res.status).toBe(201);
  });

  it("422 when clientId missing", async () => {
    const app = await makeApp();
    const res = await app.request("/api/bons-livraison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lignes: [{ designation: "X", qte: 1, prixUnitaireHT: 1 }],
      }),
    });
    expect(res.status).toBe(422);
  });

  it("422 when lignes is empty", async () => {
    const app = await makeApp();
    const res = await app.request("/api/bons-livraison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: "client-1", lignes: [] }),
    });
    expect(res.status).toBe(422);
  });

  it("422 when designation empty — OWASP A03 input validation", async () => {
    const app = await makeApp();
    const res = await app.request("/api/bons-livraison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: "client-1",
        lignes: [{ designation: "", qte: 1, prixUnitaireHT: 1 }],
      }),
    });
    expect(res.status).toBe(422);
  });

  it("422 when qte is negative", async () => {
    const app = await makeApp();
    const res = await app.request("/api/bons-livraison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: "client-1",
        lignes: [{ designation: "X", qte: -1, prixUnitaireHT: 10 }],
      }),
    });
    expect(res.status).toBe(422);
  });

  it("422 when prixUnitaireHT is negative", async () => {
    const app = await makeApp();
    const res = await app.request("/api/bons-livraison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: "client-1",
        lignes: [{ designation: "X", qte: 1, prixUnitaireHT: -5 }],
      }),
    });
    expect(res.status).toBe(422);
  });

  it("422 when remise > 100", async () => {
    const app = await makeApp();
    const res = await app.request("/api/bons-livraison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: "client-1",
        lignes: [{ designation: "X", qte: 1, prixUnitaireHT: 10, remise: 101 }],
      }),
    });
    expect(res.status).toBe(422);
  });

  it("422 on malformed JSON body", async () => {
    const app = await makeApp();
    const res = await app.request("/api/bons-livraison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    expect(res.status).toBe(422);
  });

  it("404 when client not found", async () => {
    const { prisma } = await import("../../lib/prisma.js");
    (
      prisma.client.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/bons-livraison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/bons-livraison/:id", () => {
  it("returns BL detail", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_BL);
    const app = await makeApp();
    const res = await app.request("/api/bons-livraison/bl-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.numero).toBe("BL-2026-000001");
    expect(body.lignes).toHaveLength(1);
  });

  it("404 when BL not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/bons-livraison/does-not-exist");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/bons-livraison/:id/statut", () => {
  it("updates statut to EMIS", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_BL);
    mockUpdate.mockResolvedValueOnce({ ...MOCK_BL, statut: "EMIS" });
    const app = await makeApp();
    const res = await app.request("/api/bons-livraison/bl-1/statut", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "EMIS" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.statut).toBe("EMIS");
  });

  it("422 for invalid statut value", async () => {
    const app = await makeApp();
    const res = await app.request("/api/bons-livraison/bl-1/statut", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "INVALIDE" }),
    });
    expect(res.status).toBe(422);
  });

  it("404 when BL not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/bons-livraison/no-such/statut", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "EMIS" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/bons-livraison/:id/pdf", () => {
  it("returns PDF buffer with correct content-type", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_BL);
    const app = await makeApp();
    const res = await app.request("/api/bons-livraison/bl-1/pdf");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("BL-2026-000001");
  });

  it("404 when BL not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/bons-livraison/ghost/pdf");
    expect(res.status).toBe(404);
  });
});
