/**
 * Route tests for /api/config
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

const GERANT_USER = { id: "u1", username: "g", role: "GERANT" as const, nom: "G", prenom: "G" };
const VENDEUR_USER = { ...GERANT_USER, role: "VENDEUR" as const };

const MOCK_CONFIG = {
  id: "default",
  raisonSociale: "Test",
  formeJuridique: null,
  capitalSocial: null,
  siret: null,
  tvaIntracommunautaire: null,
  adresse: null,
  codePostal: null,
  ville: null,
  pays: "FR",
  telephone: null,
  email: null,
  iban: null,
  rcs: null,
  villeRCS: null,
  codeAPE: null,
  regimeTVA: "NORMAL",
  responsableRGPD: null,
  emailRGPD: null,
  smtpHost: null,
  smtpPort: null,
  smtpUser: null,
  smtpPass: "secret",
  smtpFrom: null,
  smtpTls: true,
};

const mockFindUnique = vi.fn();
const mockUpsert = vi.fn().mockResolvedValue(MOCK_CONFIG);

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    configEntreprise: { findUnique: mockFindUnique, upsert: mockUpsert },
  },
}));

vi.mock("../../lib/audit.js", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

const mockSendTestEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("../../lib/email.js", () => ({
  sendTestEmail: mockSendTestEmail,
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
  const { configRouter } = await import("../../routes/config.js");
  const app = new Hono();
  app.route("/api/config", configRouter);
  return app;
}

beforeAll(() => {
  process.env.SIGNING_SECRET = "test-secret-minimum-32-bytes-long!";
});

beforeEach(() => {
  _currentUser = GERANT_USER;
  mockFindUnique.mockReset();
  mockSendTestEmail.mockReset();
  mockSendTestEmail.mockResolvedValue(undefined);
});

describe("GET /api/config", () => {
  it("returns empty when no config", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/config");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({});
  });

  it("returns config with smtpPassSet flag (no raw password)", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_CONFIG);
    const app = await makeApp();
    const res = await app.request("/api/config");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.smtpPass).toBeUndefined();
    expect(body.smtpPassSet).toBe(true);
  });
});

describe("PUT /api/config", () => {
  it("422 invalid", async () => {
    const app = await makeApp();
    const res = await app.request("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });

  it("200 create new config", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raisonSociale: "Newco",
        capitalSocial: 1000,
        smtpPort: 587,
        email: "x@y.com",
        smtpPass: "newsecret",
      }),
    });
    expect(res.status).toBe(200);
  });

  it("200 update existing", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_CONFIG);
    const app = await makeApp();
    const res = await app.request("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raisonSociale: "Updated",
        smtpPort: "",
        capitalSocial: "",
        email: "",
      }),
    });
    expect(res.status).toBe(200);
  });

  it("403 for VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raisonSociale: "X" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/config/smtp-test", () => {
  it("422 missing email", async () => {
    const app = await makeApp();
    const res = await app.request("/api/config/smtp-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });

  it("200 success", async () => {
    const app = await makeApp();
    const res = await app.request("/api/config/smtp-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "x@y.com" }),
    });
    expect(res.status).toBe(200);
  });

  it("500 when send fails (Error)", async () => {
    mockSendTestEmail.mockRejectedValueOnce(new Error("smtp down"));
    const app = await makeApp();
    const res = await app.request("/api/config/smtp-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "x@y.com" }),
    });
    expect(res.status).toBe(500);
  });

  it("500 when send fails (non-Error)", async () => {
    mockSendTestEmail.mockRejectedValueOnce("nope");
    const app = await makeApp();
    const res = await app.request("/api/config/smtp-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "x@y.com" }),
    });
    expect(res.status).toBe(500);
  });

  it("403 for VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/config/smtp-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "x@y.com" }),
    });
    expect(res.status).toBe(403);
  });
});
