/**
 * Route tests for /api/clotures
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

const GERANT_USER = { id: "u1", username: "g", role: "GERANT" as const, nom: "G", prenom: "G" };
const VENDEUR_USER = { ...GERANT_USER, role: "VENDEUR" as const };

const MOCK_CLOTURE = {
  id: "cl-1",
  numeroCloture: 1,
  date: new Date(),
  createdAt: new Date(),
  gerantId: "u1",
  gerant: { prenom: "P", nom: "N" },
  nbVentes: 5,
  totalEspeces: 50,
  totalCB: 50,
  totalCheque: 0,
  totalVirement: 0,
  totalTR: 0,
  totalHT: 80,
  totalTVA: 20,
  totalTTC: 100,
  totalVentes: 100,
  recapVendeurs: [],
  recapTVA: [],
  recapProduits: [],
  ventesAnnulees: [],
  hashCumulatif: "abc",
};

const mockFindMany = vi.fn().mockResolvedValue([MOCK_CLOTURE]);
const mockFindUnique = vi.fn();
const mockFindFirst = vi.fn();
const mockDelete = vi.fn().mockResolvedValue(MOCK_CLOTURE);
const mockConfigFindUnique = vi.fn().mockResolvedValue(null);
const mockTransaction = vi.fn().mockResolvedValue(MOCK_CLOTURE);

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    clotureCaisse: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      findFirst: mockFindFirst,
      delete: mockDelete,
    },
    configEntreprise: { findUnique: mockConfigFindUnique },
    $transaction: mockTransaction,
  },
}));

vi.mock("../../lib/audit.js", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../lib/compute-cloture.js", () => ({
  computeClotureApercu: vi.fn().mockResolvedValue({
    totalTTC: 100,
    totalHT: 80,
    totalTVA: 20,
    nbVentes: 5,
    totalEspeces: 50,
    totalCB: 50,
    totalCheque: 0,
    totalVirement: 0,
    totalTR: 0,
    recapVendeurs: [],
    recapTVA: [],
    recapProduits: [],
    ventesAnnulees: [],
  }),
}));

vi.mock("../../pdf/cloture-pdf.js", () => ({
  ClotureDocument: () => null,
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
  const { cloturesRouter } = await import("../../routes/clotures.js");
  const app = new Hono();
  app.route("/api/clotures", cloturesRouter);
  return app;
}

beforeAll(() => {
  process.env.SIGNING_SECRET = "test-secret-minimum-32-bytes-long!";
});

beforeEach(() => {
  _currentUser = GERANT_USER;
  mockFindUnique.mockReset();
  mockFindFirst.mockReset();
});

describe("GET /api/clotures", () => {
  it("200 list", async () => {
    const app = await makeApp();
    const res = await app.request("/api/clotures");
    expect(res.status).toBe(200);
  });

  it("403 for VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/clotures");
    expect(res.status).toBe(403);
  });
});

describe("POST /api/clotures", () => {
  it("409 already closed", async () => {
    mockFindFirst.mockResolvedValueOnce({ numeroCloture: 1 });
    const app = await makeApp();
    const res = await app.request("/api/clotures", { method: "POST" });
    expect(res.status).toBe(409);
  });

  it("201 creates cloture", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    // The transaction callback will call tx.clotureCaisse.findFirst then create.
    mockTransaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        clotureCaisse: {
          findFirst: vi.fn().mockResolvedValue({ numeroCloture: 0, hashCumulatif: "" }),
          create: vi.fn().mockResolvedValue(MOCK_CLOTURE),
        },
      };
      return fn(tx);
    });
    const app = await makeApp();
    const res = await app.request("/api/clotures", { method: "POST" });
    expect(res.status).toBe(201);
  });

  it("201 first ever cloture (no previous)", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    mockTransaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        clotureCaisse: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(MOCK_CLOTURE),
        },
      };
      return fn(tx);
    });
    const app = await makeApp();
    const res = await app.request("/api/clotures", { method: "POST" });
    expect(res.status).toBe(201);
  });
});

describe("GET /api/clotures/apercu", () => {
  it("returns apercu when not closed", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/clotures/apercu");
    expect(res.status).toBe(200);
  });

  it("409 when already closed", async () => {
    mockFindFirst.mockResolvedValueOnce({ id: "cl1", numeroCloture: 1 });
    const app = await makeApp();
    const res = await app.request("/api/clotures/apercu");
    expect(res.status).toBe(409);
  });
});

describe("DELETE /api/clotures/today", () => {
  it("404 no cloture today", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/clotures/today", { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  it("200 deletes", async () => {
    mockFindFirst.mockResolvedValueOnce(MOCK_CLOTURE);
    const app = await makeApp();
    const res = await app.request("/api/clotures/today", { method: "DELETE" });
    expect(res.status).toBe(200);
  });
});

describe("GET /api/clotures/:id", () => {
  it("404", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/clotures/missing");
    expect(res.status).toBe(404);
  });

  it("200", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_CLOTURE);
    const app = await makeApp();
    const res = await app.request("/api/clotures/cl-1");
    expect(res.status).toBe(200);
  });

  it("200 with null json fields", async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...MOCK_CLOTURE,
      recapVendeurs: null,
      recapTVA: null,
      recapProduits: null,
      ventesAnnulees: null,
    });
    const app = await makeApp();
    const res = await app.request("/api/clotures/cl-1");
    expect(res.status).toBe(200);
  });
});

describe("GET /api/clotures/:id/pdf", () => {
  it("404", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/clotures/missing/pdf");
    expect(res.status).toBe(404);
  });

  it("returns PDF", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_CLOTURE);
    const app = await makeApp();
    const res = await app.request("/api/clotures/cl-1/pdf");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
  });

  it("returns PDF using config raisonSociale", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_CLOTURE);
    mockConfigFindUnique.mockResolvedValueOnce({ raisonSociale: "MyShop" });
    const app = await makeApp();
    const res = await app.request("/api/clotures/cl-1/pdf");
    expect(res.status).toBe(200);
  });
});
