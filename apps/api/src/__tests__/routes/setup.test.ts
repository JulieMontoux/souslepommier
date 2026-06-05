/**
 * Route tests for /api/setup
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

const MOCK_USER = {
  id: "u1",
  username: "admin",
  email: "admin@example.com",
  prenom: "Admin",
  nom: "User",
  role: "SUPERADMIN",
  createdAt: new Date(),
};

const mockFindUnique = vi.fn();
const mockCreate = vi.fn().mockResolvedValue(MOCK_USER);

vi.mock("../../lib/prisma.js", () => ({
  prisma: { user: { findUnique: mockFindUnique, create: mockCreate } },
}));

vi.mock("../../lib/audit.js", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed-pwd") },
}));

async function makeApp() {
  const { setupRouter } = await import("../../routes/setup.js");
  const app = new Hono();
  app.route("/api/setup", setupRouter);
  return app;
}

beforeAll(() => {
  process.env.SIGNING_SECRET = "test-secret-minimum-32-bytes-long!";
});

beforeEach(() => {
  process.env.SETUP_SECRET = "secret-token";
  mockFindUnique.mockReset();
});

describe("POST /api/setup/create-user", () => {
  const VALID_BODY = {
    token: "secret-token",
    username: "admin",
    email: "admin@example.com",
    prenom: "Admin",
    nom: "User",
    role: "SUPERADMIN",
    password: "longenoughpwd",
  };

  it("403 when SETUP_SECRET not set", async () => {
    delete process.env.SETUP_SECRET;
    const app = await makeApp();
    const res = await app.request("/api/setup/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });
    expect(res.status).toBe(403);
  });

  it("403 invalid token", async () => {
    const app = await makeApp();
    const res = await app.request("/api/setup/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_BODY, token: "wrong" }),
    });
    expect(res.status).toBe(403);
  });

  it("422 invalid payload", async () => {
    const app = await makeApp();
    const res = await app.request("/api/setup/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "secret-token", username: "x" }),
    });
    expect(res.status).toBe(422);
  });

  it("422 password too short", async () => {
    const app = await makeApp();
    const res = await app.request("/api/setup/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_BODY, password: "short" }),
    });
    expect(res.status).toBe(422);
  });

  it("422 malformed JSON", async () => {
    const app = await makeApp();
    const res = await app.request("/api/setup/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "garbage",
    });
    expect(res.status).toBe(422);
  });

  it("409 duplicate username", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "exist" });
    const app = await makeApp();
    const res = await app.request("/api/setup/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });
    expect(res.status).toBe(409);
  });

  it("409 duplicate email", async () => {
    mockFindUnique.mockResolvedValueOnce(null); // username check
    mockFindUnique.mockResolvedValueOnce({ id: "exist" }); // email check
    const app = await makeApp();
    const res = await app.request("/api/setup/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });
    expect(res.status).toBe(409);
  });

  it("201 creates user", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/setup/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });
    expect(res.status).toBe(201);
  });

  it("201 creates user without email", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const app = await makeApp();
    const res = await app.request("/api/setup/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_BODY, email: "" }),
    });
    expect(res.status).toBe(201);
  });
});
