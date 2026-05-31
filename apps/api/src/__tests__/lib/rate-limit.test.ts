import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimit } from "../../lib/rate-limit.js";
import { unlinkSync } from "node:fs";

const KEY = `test-ip-${Date.now()}`;

beforeEach(() => {
  resetRateLimit(KEY);
  try {
    unlinkSync("/tmp/slp-rate-limit.json");
  } catch {
    /* not exists */
  }
});

describe("checkRateLimit", () => {
  it("allows first request", () => {
    const result = checkRateLimit(KEY);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("counts up to MAX_ATTEMPTS (5) then blocks", () => {
    for (let i = 0; i < 4; i++) checkRateLimit(KEY);
    const last = checkRateLimit(KEY);
    expect(last.allowed).toBe(true);
    expect(last.remaining).toBe(0);
    const blocked = checkRateLimit(KEY);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("different keys are independent", () => {
    const other = `other-${Date.now()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(KEY);
    const result = checkRateLimit(other);
    expect(result.allowed).toBe(true);
    resetRateLimit(other);
  });

  it("resetRateLimit clears the key", () => {
    for (let i = 0; i < 5; i++) checkRateLimit(KEY);
    expect(checkRateLimit(KEY).allowed).toBe(false);
    resetRateLimit(KEY);
    expect(checkRateLimit(KEY).allowed).toBe(true);
  });

  it("returns resetAt in the future", () => {
    const { resetAt } = checkRateLimit(KEY);
    expect(resetAt).toBeGreaterThan(Date.now());
  });
});
