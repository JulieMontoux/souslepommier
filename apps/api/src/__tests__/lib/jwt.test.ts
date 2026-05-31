import { describe, it, expect, vi, beforeEach } from "vitest";

const PAYLOAD = {
  id: "user-1",
  username: "test",
  role: "GERANT" as const,
  nom: "Dupont",
  prenom: "Marie",
};

describe("signJwt / verifyJwt", () => {
  beforeEach(() => {
    process.env.SIGNING_SECRET = "test-jwt-secret-32-bytes-minimum!";
    process.env.SESSION_MAX_AGE = "3600";
    vi.resetModules();
  });

  it("signs and verifies a token", async () => {
    const { signJwt, verifyJwt } = await import("../../lib/jwt.js");
    const token = await signJwt(PAYLOAD);
    expect(typeof token).toBe("string");
    const decoded = await verifyJwt(token);
    expect(decoded?.id).toBe(PAYLOAD.id);
    expect(decoded?.role).toBe(PAYLOAD.role);
    expect(decoded?.username).toBe(PAYLOAD.username);
  });

  it("verifyJwt returns null for garbage token", async () => {
    const { verifyJwt } = await import("../../lib/jwt.js");
    expect(await verifyJwt("not.a.jwt")).toBeNull();
  });

  it("verifyJwt returns null for tampered token", async () => {
    const { signJwt, verifyJwt } = await import("../../lib/jwt.js");
    const token = await signJwt(PAYLOAD);
    const parts = token.split(".");
    parts[1] = Buffer.from(
      JSON.stringify({ id: "hacker", role: "SUPERADMIN" }),
    ).toString("base64url");
    expect(await verifyJwt(parts.join("."))).toBeNull();
  });

  it("verifyJwt returns null for empty string", async () => {
    const { verifyJwt } = await import("../../lib/jwt.js");
    expect(await verifyJwt("")).toBeNull();
  });

  it("token contains expected fields", async () => {
    const { signJwt } = await import("../../lib/jwt.js");
    const token = await signJwt(PAYLOAD);
    const raw = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );
    expect(raw.iss).toBe("souslepommier");
    expect(raw.exp).toBeGreaterThan(Date.now() / 1000);
    expect(raw.role).toBe("GERANT");
  });

  it("uses default MAX_AGE when SESSION_MAX_AGE not set", async () => {
    delete process.env.SESSION_MAX_AGE;
    vi.resetModules();
    const { signJwt } = await import("../../lib/jwt.js");
    const token = await signJwt(PAYLOAD);
    const raw = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );
    // Default is 28800s (8 hours)
    const ageSeconds = raw.exp - raw.iat;
    expect(ageSeconds).toBe(28800);
  });

  it("uses default secret when SIGNING_SECRET not set", async () => {
    delete process.env.SIGNING_SECRET;
    vi.resetModules();
    const { signJwt, verifyJwt } = await import("../../lib/jwt.js");
    const token = await signJwt(PAYLOAD);
    // Should still work with fallback secret
    const decoded = await verifyJwt(token);
    expect(decoded?.id).toBe(PAYLOAD.id);
  });
});
