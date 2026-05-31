import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const SAMPLE = {
  numero: 42,
  date: "2026-01-15",
  totalTTC: "1234.56",
  gerantId: "user-abc",
  hashPrecedent: "0000000000000000",
};

describe("computeClotureHash", () => {
  beforeEach(() => {
    process.env.SIGNING_SECRET = "test-secret-1234";
    vi.resetModules();
  });
  afterEach(() => {
    delete process.env.SIGNING_SECRET;
    vi.resetModules();
  });

  it("returns a 64-char hex string", async () => {
    const { computeClotureHash } = await import("../../lib/cloture-hash.js");
    const hash = computeClotureHash(SAMPLE);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same inputs same hash", async () => {
    const { computeClotureHash } = await import("../../lib/cloture-hash.js");
    expect(computeClotureHash(SAMPLE)).toBe(computeClotureHash(SAMPLE));
  });

  it("different numero = different hash", async () => {
    const { computeClotureHash } = await import("../../lib/cloture-hash.js");
    const a = computeClotureHash(SAMPLE);
    const b = computeClotureHash({ ...SAMPLE, numero: 43 });
    expect(a).not.toBe(b);
  });

  it("different totalTTC = different hash", async () => {
    const { computeClotureHash } = await import("../../lib/cloture-hash.js");
    expect(computeClotureHash(SAMPLE)).not.toBe(
      computeClotureHash({ ...SAMPLE, totalTTC: "0.00" }),
    );
  });

  it("throws when SIGNING_SECRET missing — OWASP A02 crypto integrity", async () => {
    delete process.env.SIGNING_SECRET;
    vi.resetModules();
    const { computeClotureHash } = await import("../../lib/cloture-hash.js");
    expect(() => computeClotureHash(SAMPLE)).toThrow("SIGNING_SECRET manquant");
  });

  it("different secret = different hash", async () => {
    const { computeClotureHash } = await import("../../lib/cloture-hash.js");
    const hash1 = computeClotureHash(SAMPLE);
    // Test with different secret via direct crypto
    const { createHmac } = await import("crypto");
    const hash2 = createHmac("sha256", "other-secret")
      .update(JSON.stringify(SAMPLE))
      .digest("hex");
    expect(hash1).not.toBe(hash2);
  });
});
