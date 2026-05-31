/**
 * OWASP A01 (Broken Access Control) + A07 (Identification & Authentication Failures)
 * Tests the auth middleware and requireRole for all bypass paths.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { Hono } from "hono";
import type { HonoEnv } from "../../lib/middleware.js";

const ACTIVE_GERANT = { actif: true, role: "GERANT" };
const INACTIVE_USER = { actif: false, role: "GERANT" };
const ACTIVE_VENDEUR = { actif: true, role: "VENDEUR" };
const ACTIVE_SUPERADMIN = { actif: true, role: "SUPERADMIN" };

// Mock prisma before importing middleware
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue(ACTIVE_GERANT),
    },
  },
}));

beforeAll(() => {
  process.env.SIGNING_SECRET = "test-secret-auth-32-bytes-minimum!";
});

async function makeApp(mockUser: typeof ACTIVE_GERANT | null, role?: string) {
  const { prisma } = await import("../../lib/prisma.js");
  (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
    mockUser,
  );

  const { authMiddleware, requireRole } =
    await import("../../lib/middleware.js");
  const app = new Hono<HonoEnv>();
  app.use("/protected", authMiddleware);
  app.get("/protected", (c) => c.json({ ok: true, role: c.get("user")?.role }));

  if (role) {
    app.use("/admin", requireRole(role as "GERANT" | "SUPERADMIN"));
    app.get("/admin", (c) => c.json({ ok: true }));
  }
  return app;
}

async function validCookie(): Promise<string> {
  const { signJwt } = await import("../../lib/jwt.js");
  const token = await signJwt({
    id: "u1",
    username: "test",
    role: "GERANT",
    nom: "Test",
    prenom: "User",
  });
  return `session=${token}`;
}

describe("authMiddleware — OWASP A07", () => {
  it("401 with no cookie", async () => {
    const app = await makeApp(ACTIVE_GERANT);
    const res = await app.request("/protected");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/non autorisé/i);
  });

  it("401 with invalid token", async () => {
    const app = await makeApp(ACTIVE_GERANT);
    const res = await app.request("/protected", {
      headers: { Cookie: "session=invalid.jwt.token" },
    });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/session expirée/i);
  });

  it("401 with empty token value", async () => {
    const app = await makeApp(ACTIVE_GERANT);
    const res = await app.request("/protected", {
      headers: { Cookie: "session=" },
    });
    expect(res.status).toBe(401);
  });

  it("401 for disabled user — OWASP A01", async () => {
    const app = await makeApp(INACTIVE_USER);
    const cookie = await validCookie();
    const res = await app.request("/protected", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/désactivé/i);
  });

  it("200 with valid token and active user", async () => {
    const app = await makeApp(ACTIVE_GERANT);
    const cookie = await validCookie();
    const res = await app.request("/protected", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("uses live DB role, not JWT role — OWASP A01", async () => {
    // JWT says GERANT but DB has VENDEUR (role was downgraded)
    const app = await makeApp(ACTIVE_VENDEUR);
    const cookie = await validCookie(); // signed as GERANT
    const res = await app.request("/protected", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("VENDEUR"); // live DB role wins
  });
});

describe("requireRole — OWASP A01", () => {
  it("403 when role insufficient", async () => {
    const app = await makeApp(ACTIVE_VENDEUR, "GERANT");
    const cookie = await validCookie();
    const res = await app.request("/admin", { headers: { Cookie: cookie } });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/refusé/i);
  });

  it("SUPERADMIN bypasses all role checks", async () => {
    const app = await makeApp(ACTIVE_SUPERADMIN, "GERANT");
    const { signJwt } = await import("../../lib/jwt.js");
    const token = await signJwt({
      id: "su1",
      username: "admin",
      role: "SUPERADMIN",
      nom: "Admin",
      prenom: "Super",
    });
    const res = await app.request("/admin", {
      headers: { Cookie: `session=${token}` },
    });
    expect(res.status).toBe(200);
  });

  it("401 no cookie on requireRole route", async () => {
    const app = await makeApp(ACTIVE_GERANT, "GERANT");
    const res = await app.request("/admin");
    expect(res.status).toBe(401);
  });
});
