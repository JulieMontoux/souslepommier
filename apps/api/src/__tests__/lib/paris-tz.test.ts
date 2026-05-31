import { describe, it, expect } from "vitest";
import {
  parisDateKey,
  parisDayBounds,
  parisMonth,
  parisYearBounds,
  parisMonthStart,
} from "../../lib/paris-tz.js";

describe("parisDateKey", () => {
  it("returns YYYY-MM-DD in Paris TZ", () => {
    // 2026-03-15 UTC noon → Paris is UTC+1 in winter
    expect(parisDateKey(new Date("2026-03-15T11:00:00Z"))).toBe("2026-03-15");
  });

  it("summer time UTC+2 — UTC 22:30 = next day in Paris", () => {
    // 2026-07-15 22:30 UTC → 00:30 on 2026-07-16 Paris time
    expect(parisDateKey(new Date("2026-07-15T22:30:00Z"))).toBe("2026-07-16");
  });

  it("winter time UTC+1 — UTC 23:30 = next day in Paris", () => {
    expect(parisDateKey(new Date("2026-01-15T23:30:00Z"))).toBe("2026-01-16");
  });
});

describe("parisDayBounds", () => {
  it("start < end", () => {
    const [start, end] = parisDayBounds(new Date("2026-06-01T12:00:00Z"));
    expect(start.getTime()).toBeLessThan(end.getTime());
  });

  it("span is exactly 24 hours minus 1ms", () => {
    const [start, end] = parisDayBounds(new Date("2026-01-15T12:00:00Z"));
    expect(end.getTime() - start.getTime()).toBe(24 * 3600_000 - 1);
  });

  it("winter: start is UTC 23:00 of previous day", () => {
    // Paris is UTC+1 in winter → midnight Paris = 23:00 UTC prev day
    const [start] = parisDayBounds(new Date("2026-01-15T12:00:00Z"));
    expect(start.toISOString()).toBe("2026-01-14T23:00:00.000Z");
  });

  it("summer: start is UTC 22:00 of previous day", () => {
    // Paris is UTC+2 in summer → midnight Paris = 22:00 UTC prev day
    const [start] = parisDayBounds(new Date("2026-07-15T12:00:00Z"));
    expect(start.toISOString()).toBe("2026-07-14T22:00:00.000Z");
  });
});

describe("parisMonth", () => {
  it("returns correct month for January", () => {
    expect(parisMonth(new Date("2026-01-15T12:00:00Z"))).toBe(1);
  });
  it("returns correct month for December", () => {
    expect(parisMonth(new Date("2026-12-15T12:00:00Z"))).toBe(12);
  });
  it("handles UTC/Paris month boundary — UTC 23:30 Jan 31 = Feb 1 Paris in winter", () => {
    // Paris UTC+1: 2026-01-31T23:30:00Z = 2026-02-01T00:30:00 Paris
    expect(parisMonth(new Date("2026-01-31T23:30:00Z"))).toBe(2);
  });
});

describe("parisYearBounds", () => {
  it("returns start before end", () => {
    const [from, to] = parisYearBounds(2026);
    expect(from.getTime()).toBeLessThan(to.getTime());
  });

  it("spans roughly one year", () => {
    const [from, to] = parisYearBounds(2026);
    const diffDays = (to.getTime() - from.getTime()) / (24 * 3600_000);
    expect(diffDays).toBeGreaterThan(364);
    expect(diffDays).toBeLessThan(366);
  });

  it("start is Jan 1 Paris time", () => {
    const [from] = parisYearBounds(2026);
    // Jan 1 2026 is winter: Paris UTC+1 → midnight = 23:00 UTC Dec 31
    expect(from.toISOString()).toBe("2025-12-31T23:00:00.000Z");
  });
});

describe("parisMonthStart", () => {
  it("returns first day of month bounds start", () => {
    const result = parisMonthStart(new Date("2026-07-15T12:00:00Z"));
    // July 1 2026 Paris (summer UTC+2) → 22:00 UTC June 30
    expect(result.toISOString()).toBe("2026-06-30T22:00:00.000Z");
  });

  it("January first day winter", () => {
    const result = parisMonthStart(new Date("2026-01-20T12:00:00Z"));
    expect(result.toISOString()).toBe("2025-12-31T23:00:00.000Z");
  });
});
