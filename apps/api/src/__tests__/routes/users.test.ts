/**
 * Route tests for /api/users
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

const GERANT_USER = { id: "u1", username: "g", role: "GERANT" as const, nom: "G", prenom: "G" };
const SUPERADMIN_USER = { ...GERANT_USER, role: "SUPERADMIN" as const };
const VENDEUR_USER = { ...GERANT_USER, role: "VENDEUR" as const };

const MOCK_USER = {
  id: "u9",
  username: "marie",
  email: "marie@example.com",
  prenom: "Marie",
  nom: "Dupont",
  role: "VENDEUR",
  actif: true,
  lastLoginAt: new Date(),
  createdAt: new Date(),
  _count: { ventes: 5 },
};

const mockFindMany = vi.fn().mockResolvedValue([MOCK_USER]);
const mockFindUnique = vi.fn();
const mockFindFirst = vi.fn();
const mockCreate = vi.fn().mockResolvedValue(MOCK_USER);
const mockUpdate = vi.fn().mockResolvedValue(MOCK_USER);
const mockAggregate = vi.fn().mockResolvedValue({
  _count: { id: 5 },
  _sum: { totalHT: 100, totalTTC: 120 },
});
const mockCount = vi.fn().mockResolvedValue(10);

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      findFirst: mockFindFirst,
      create: mockCreate,
      update: mockUpdate,
    },
    vente: { aggregate: mockAggregate, count: mockCount },
  },
}));

vi.mock("../../lib/audit.js", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../lib/email.js", () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendResetPasswordEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hash") },
}));

let _currentUser: typeof GERANT_USER | typeof SUPERADMIN_USER | typeof VENDEUR_USER = GERANT_USER;

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
  const { usersRouter } = await import("../../routes/users.js");
  const app = new Hono();
  app.route("/api/users", usersRouter);
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

describe("GET /api/users", () => {
  it("returns list with nbVentesMois", async () => {
    const app = await makeApp();
    const res = await app.request("/api/users");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].nbVentesMois).toBe(5);
  });

  it("handles null lastLoginAt", async () => {
    mockFindMany.mockResolvedValueOnce([{ ...MOCK_USER, lastLoginAt: null }]);
    const app = await makeApp();
    const res = await app.request("/api/users");
    expect(res.status).toBe(200);
  });

  it("403 for VENDEUR", async () => {
    _currentUser = VENDEUR_USER;
    const app = await makeApp();
    const res = await app.request("/api/users");
    expect(res.status).toBe(403);
  });
});

describe("POST /api/users", () => {
  const VALID = { username: "newuser", email: "new@e.com", prenom: "N", nom: "U", role: "VENDEUR" };

  it("422 invalid username regex", async () => {
    const app = await makeApp();
    const res = await app.request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID, username: "BAD UPPER" }),
    });
    expect(res.status).toBe(422);
  });

  it("422 missing fields", async () => {
    const app = await makeApp();
    const res = await app.request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });

  it("403 GERANT cannot create GERANT", async () => {
    const app = await makeApp();
    const res = await app.request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID, role: "GERANT" }),
    });
    expect(res.status).toBe(403);
  });

  it("201 SUPERADMIN can create GERANT", async () => {
    _currentUser = SUPERADMIN_USER;
    mockFindUnique.mockResolvedValueOnce(null); // username
    mockFindUnique.mockResolvedValueOnce(null); // email
    const app = await makeApp();
    const res = await app.request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID, role: "GERANT" }),
    });
    expect(res.status).toBe(201);
  });

  it("409 username taken", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "existing" });
    const app = await makeApp();
    const res = await app.request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID),
    });
    expect(res.status).toBe(409);
  });

  it("409 email taken", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockFindUnique.mockResolvedValueOnce({ id: "existing" });
    const app = await makeApp();
    const res = await app.request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID),
    });
    expect(res.status).toBe(409);
  });

  it("201 success without email", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID, email: "" }),
    });
    expect(res.status).toBe(201);
  });

  it("201 silently ignores email send failure", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockFindUnique.mockResolvedValueOnce(null);
    const { sendWelcomeEmail } = await import("../../lib/email.js");
    (sendWelcomeEmail as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("smtp"));
    const app = await makeApp();
    const res = await app.request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID),
    });
    expect(res.status).toBe(201);
  });
});

describe("GET /api/users/:id", () => {
  it("404 user not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/users/missing");
    expect(res.status).toBe(404);
  });

  it("returns user with stats", async () => {
    mockFindUnique.mockResolvedValueOnce(MOCK_USER);
    const app = await makeApp();
    const res = await app.request("/api/users/u9");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nbVentesMois).toBe(5);
  });

  it("handles null lastLoginAt and zero totals", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...MOCK_USER, lastLoginAt: null });
    mockAggregate.mockResolvedValueOnce({ _count: { id: 0 }, _sum: { totalHT: null, totalTTC: null } });
    mockAggregate.mockResolvedValueOnce({ _sum: { totalHT: null, totalTTC: null } });
    mockCount.mockResolvedValueOnce(0);
    const app = await makeApp();
    const res = await app.request("/api/users/u9");
    expect(res.status).toBe(200);
  });
});

describe("PUT /api/users/:id", () => {
  it("404 not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/users/x", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prenom: "X" }),
    });
    expect(res.status).toBe(404);
  });

  it("422 invalid body", async () => {
    const app = await makeApp();
    const res = await app.request("/api/users/x", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "bad-email" }),
    });
    expect(res.status).toBe(422);
  });

  it("updates", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "u9" });
    const app = await makeApp();
    const res = await app.request("/api/users/u9", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prenom: "Renamed" }),
    });
    expect(res.status).toBe(200);
  });

  it("409 username taken", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "u9" });
    mockFindFirst.mockResolvedValueOnce({ id: "other" });
    const app = await makeApp();
    const res = await app.request("/api/users/u9", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "taken" }),
    });
    expect(res.status).toBe(409);
  });

  it("409 email taken", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "u9" });
    mockFindFirst.mockResolvedValueOnce({ id: "other" });
    const app = await makeApp();
    const res = await app.request("/api/users/u9", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "taken@e.com" }),
    });
    expect(res.status).toBe(409);
  });

  it("accepts username/email when none taken", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "u9" });
    mockFindFirst.mockResolvedValueOnce(null);
    mockFindFirst.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/users/u9", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "free", email: "free@e.com" }),
    });
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/users/:id/statut", () => {
  it("409 cannot deactivate self", async () => {
    const app = await makeApp();
    const res = await app.request(`/api/users/${GERANT_USER.id}/statut`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: false }),
    });
    expect(res.status).toBe(409);
  });

  it("422 invalid body", async () => {
    const app = await makeApp();
    const res = await app.request("/api/users/u9/statut", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: "x" }),
    });
    expect(res.status).toBe(422);
  });

  it("404 not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/users/u9/statut", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: false }),
    });
    expect(res.status).toBe(404);
  });

  it("204 deactivates", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "u9" });
    const app = await makeApp();
    const res = await app.request("/api/users/u9/statut", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: false }),
    });
    expect(res.status).toBe(204);
  });

  it("204 activates", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "u9" });
    const app = await makeApp();
    const res = await app.request("/api/users/u9/statut", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: true }),
    });
    expect(res.status).toBe(204);
  });
});

describe("POST /api/users/:id/reset-password", () => {
  it("404 not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/users/missing/reset-password", { method: "POST" });
    expect(res.status).toBe(404);
  });

  it("409 if inactive", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...MOCK_USER, actif: false });
    const app = await makeApp();
    const res = await app.request("/api/users/u9/reset-password", { method: "POST" });
    expect(res.status).toBe(409);
  });

  it("200 reset with email", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...MOCK_USER, actif: true });
    const app = await makeApp();
    const res = await app.request("/api/users/u9/reset-password", { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.emailSent).toBe(true);
  });

  it("200 reset without email", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...MOCK_USER, actif: true, email: null });
    const app = await makeApp();
    const res = await app.request("/api/users/u9/reset-password", { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.emailSent).toBe(false);
  });

  it("200 silently swallows email errors", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...MOCK_USER, actif: true });
    const { sendResetPasswordEmail } = await import("../../lib/email.js");
    (sendResetPasswordEmail as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("smtp"));
    const app = await makeApp();
    const res = await app.request("/api/users/u9/reset-password", { method: "POST" });
    expect(res.status).toBe(200);
  });
});
