/**
 * Route tests for /api/auth — login, logout, forgot-password, reset-password, change-password, me
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

const MOCK_USER = {
  id: "u1",
  username: "marie",
  email: "marie@example.com",
  passwordHash: "$2a$12$hash",
  prenom: "Marie",
  nom: "Dupont",
  role: "GERANT",
  actif: true,
};

const mockUserFindUnique = vi.fn();
const mockUserFindFirst = vi.fn();
const mockUserUpdate = vi.fn().mockResolvedValue(MOCK_USER);
const mockResetTokenFindUnique = vi.fn();
const mockResetTokenCreate = vi.fn().mockResolvedValue({ id: "t1" });
const mockResetTokenUpdate = vi.fn().mockResolvedValue({ id: "t1" });
const mockResetTokenUpdateMany = vi.fn().mockResolvedValue({ count: 0 });

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      findFirst: mockUserFindFirst,
      update: mockUserUpdate,
    },
    passwordResetToken: {
      findUnique: mockResetTokenFindUnique,
      create: mockResetTokenCreate,
      update: mockResetTokenUpdate,
      updateMany: mockResetTokenUpdateMany,
    },
  },
}));

vi.mock("../../lib/audit.js", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../lib/email.js", () => ({
  sendForgotPasswordEmail: vi.fn().mockResolvedValue(undefined),
}));

const mockBcryptCompare = vi.fn();
const mockBcryptHash = vi.fn().mockResolvedValue("new-hash");
vi.mock("bcryptjs", () => ({
  default: { compare: mockBcryptCompare, hash: mockBcryptHash },
}));

const mockCheckRateLimit = vi.fn().mockReturnValue({ allowed: true, remaining: 4, resetAt: Date.now() + 1000 });
const mockResetRateLimit = vi.fn();
vi.mock("../../lib/rate-limit.js", () => ({
  checkRateLimit: mockCheckRateLimit,
  resetRateLimit: mockResetRateLimit,
}));

const mockSignJwt = vi.fn().mockResolvedValue("signed.jwt.token");
const mockVerifyJwt = vi.fn();
vi.mock("../../lib/jwt.js", () => ({
  signJwt: mockSignJwt,
  verifyJwt: mockVerifyJwt,
  MAX_AGE: 28800,
}));

// authMiddleware for /change-password — pass through with user
vi.mock("../../lib/middleware.js", () => ({
  authMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("user", { id: "u1", username: "marie", role: "GERANT", nom: "Dupont", prenom: "Marie" });
    await next();
  }),
  requireRole: () =>
    vi.fn(async (_: unknown, next: () => Promise<void>) => {
      await next();
    }),
  HonoEnv: {},
}));

async function makeApp() {
  const { authRouter } = await import("../../routes/auth.js");
  const app = new Hono();
  app.route("/api/auth", authRouter);
  return app;
}

beforeAll(() => {
  process.env.SIGNING_SECRET = "test-secret-minimum-32-bytes-long!";
});

beforeEach(() => {
  mockUserFindUnique.mockReset();
  mockUserFindFirst.mockReset();
  mockResetTokenFindUnique.mockReset();
  mockBcryptCompare.mockReset();
  mockVerifyJwt.mockReset();
  mockCheckRateLimit.mockReturnValue({ allowed: true, remaining: 4, resetAt: Date.now() + 1000 });
});

describe("POST /api/auth/login", () => {
  it("422 invalid body", async () => {
    const app = await makeApp();
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });

  it("422 malformed JSON", async () => {
    const app = await makeApp();
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "x",
    });
    expect(res.status).toBe(422);
  });

  it("429 when rate-limited", async () => {
    mockCheckRateLimit.mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
    const app = await makeApp();
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "marie", password: "pass" }),
    });
    expect(res.status).toBe(429);
  });

  it("401 user not found", async () => {
    mockUserFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "ghost", password: "pass" }),
    });
    expect(res.status).toBe(401);
  });

  it("401 user inactive", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ ...MOCK_USER, actif: false });
    const app = await makeApp();
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "marie", password: "pass" }),
    });
    expect(res.status).toBe(401);
  });

  it("401 bad password", async () => {
    mockUserFindUnique.mockResolvedValueOnce(MOCK_USER);
    mockBcryptCompare.mockResolvedValueOnce(false);
    const app = await makeApp();
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "1.2.3.4",
        "user-agent": "ua",
      },
      body: JSON.stringify({ username: "marie", password: "wrong" }),
    });
    expect(res.status).toBe(401);
  });

  it("200 valid login (uses x-real-ip fallback)", async () => {
    mockUserFindUnique.mockResolvedValueOnce(MOCK_USER);
    mockBcryptCompare.mockResolvedValueOnce(true);
    const app = await makeApp();
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-real-ip": "5.6.7.8",
      },
      body: JSON.stringify({ username: "marie", password: "good" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("session=");
  });
});

describe("POST /api/auth/logout", () => {
  it("returns ok with no cookie", async () => {
    const app = await makeApp();
    const res = await app.request("/api/auth/logout", { method: "POST" });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("logs out with valid cookie", async () => {
    mockVerifyJwt.mockResolvedValueOnce({ id: "u1", username: "marie", role: "GERANT", nom: "D", prenom: "M" });
    const app = await makeApp();
    const res = await app.request("/api/auth/logout", {
      method: "POST",
      headers: { Cookie: "session=valid.token", "x-forwarded-for": "1.2.3.4" },
    });
    expect(res.status).toBe(200);
  });

  it("logs out with invalid token", async () => {
    mockVerifyJwt.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/auth/logout", {
      method: "POST",
      headers: { Cookie: "session=bad" },
    });
    expect(res.status).toBe(200);
  });
});

describe("GET /api/auth/me", () => {
  it("401 no cookie", async () => {
    const app = await makeApp();
    const res = await app.request("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("401 invalid token", async () => {
    mockVerifyJwt.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/auth/me", { headers: { Cookie: "session=x" } });
    expect(res.status).toBe(401);
  });

  it("401 user inactive", async () => {
    mockVerifyJwt.mockResolvedValueOnce({ id: "u1", username: "marie", role: "GERANT", nom: "D", prenom: "M" });
    mockUserFindUnique.mockResolvedValueOnce({ ...MOCK_USER, actif: false });
    const app = await makeApp();
    const res = await app.request("/api/auth/me", { headers: { Cookie: "session=x" } });
    expect(res.status).toBe(401);
  });

  it("200 returns user", async () => {
    mockVerifyJwt.mockResolvedValueOnce({ id: "u1", username: "marie", role: "GERANT", nom: "D", prenom: "M" });
    mockUserFindUnique.mockResolvedValueOnce(MOCK_USER);
    const app = await makeApp();
    const res = await app.request("/api/auth/me", { headers: { Cookie: "session=x" } });
    expect(res.status).toBe(200);
  });
});

describe("POST /api/auth/forgot-password", () => {
  it("returns ok on bad body (anti-leak)", async () => {
    const app = await makeApp();
    const res = await app.request("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
  });

  it("returns ok when user not found (anti-leak)", async () => {
    mockUserFindFirst.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "ghost" }),
    });
    expect(res.status).toBe(200);
  });

  it("returns ok when user has no email", async () => {
    mockUserFindFirst.mockResolvedValueOnce({ id: "u1", username: "x", email: null, prenom: "P" });
    const app = await makeApp();
    const res = await app.request("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "x" }),
    });
    expect(res.status).toBe(200);
  });

  it("creates reset token when user found with email", async () => {
    mockUserFindFirst.mockResolvedValueOnce({ id: "u1", username: "marie", email: "m@e.com", prenom: "M" });
    const app = await makeApp();
    const res = await app.request("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "marie" }),
    });
    expect(res.status).toBe(200);
    expect(mockResetTokenCreate).toHaveBeenCalled();
  });

  it("handles email send failure silently", async () => {
    mockUserFindFirst.mockResolvedValueOnce({ id: "u1", username: "marie", email: "m@e.com", prenom: "M" });
    const { sendForgotPasswordEmail } = await import("../../lib/email.js");
    (sendForgotPasswordEmail as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("smtp fail"));
    const app = await makeApp();
    const res = await app.request("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "marie" }),
    });
    expect(res.status).toBe(200);
  });
});

describe("POST /api/auth/reset-password", () => {
  it("422 invalid payload", async () => {
    const app = await makeApp();
    const res = await app.request("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "x", newPassword: "short" }),
    });
    expect(res.status).toBe(422);
  });

  it("400 invalid/expired token (not found)", async () => {
    mockResetTokenFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "x", newPassword: "longenough123" }),
    });
    expect(res.status).toBe(400);
  });

  it("400 token already used", async () => {
    mockResetTokenFindUnique.mockResolvedValueOnce({
      id: "t1",
      userId: "u1",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(),
    });
    const app = await makeApp();
    const res = await app.request("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "x", newPassword: "longenough123" }),
    });
    expect(res.status).toBe(400);
  });

  it("400 token expired", async () => {
    mockResetTokenFindUnique.mockResolvedValueOnce({
      id: "t1",
      userId: "u1",
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
    });
    const app = await makeApp();
    const res = await app.request("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "x", newPassword: "longenough123" }),
    });
    expect(res.status).toBe(400);
  });

  it("200 success", async () => {
    mockResetTokenFindUnique.mockResolvedValueOnce({
      id: "t1",
      userId: "u1",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });
    const app = await makeApp();
    const res = await app.request("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "x", newPassword: "longenough123" }),
    });
    expect(res.status).toBe(200);
  });
});

describe("POST /api/auth/change-password", () => {
  it("422 invalid body", async () => {
    const app = await makeApp();
    const res = await app.request("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: "x", newPassword: "short" }),
    });
    expect(res.status).toBe(422);
  });

  it("404 user not found", async () => {
    mockUserFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: "x", newPassword: "longenough123" }),
    });
    expect(res.status).toBe(404);
  });

  it("401 wrong current password", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ passwordHash: "h" });
    mockBcryptCompare.mockResolvedValueOnce(false);
    const app = await makeApp();
    const res = await app.request("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: "x", newPassword: "longenough123" }),
    });
    expect(res.status).toBe(401);
  });

  it("200 success", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ passwordHash: "h" });
    mockBcryptCompare.mockResolvedValueOnce(true);
    const app = await makeApp();
    const res = await app.request("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: "old", newPassword: "longenough123" }),
    });
    expect(res.status).toBe(200);
  });
});
