import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn().mockResolvedValue({});

vi.mock("../../lib/prisma.js", () => ({
  prisma: { journalAudit: { create: mockCreate } },
}));

describe("logAudit", () => {
  beforeEach(() => mockCreate.mockClear());

  it("creates audit record with all fields", async () => {
    const { logAudit } = await import("../../lib/audit.js");
    await logAudit({
      userId: "u1",
      action: "LOGIN_SUCCESS",
      entite: "User",
      entiteId: "u1",
      ancienneValeur: { role: "VENDEUR" },
      nouvelleValeur: { role: "GERANT" },
      ip: "127.0.0.1",
      userAgent: "Mozilla/5.0",
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u1",
        action: "LOGIN_SUCCESS",
        entite: "User",
        entiteId: "u1",
        ip: "127.0.0.1",
        userAgent: "Mozilla/5.0",
      }),
    });
  });

  it("handles missing optional fields gracefully", async () => {
    const { logAudit } = await import("../../lib/audit.js");
    await logAudit({ action: "LOGOUT", entite: "Session" });
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: null,
        entiteId: null,
        ip: null,
        userAgent: null,
      }),
    });
  });

  it("does not throw when prisma fails (silent fail)", async () => {
    mockCreate.mockRejectedValueOnce(new Error("DB down"));
    const { logAudit } = await import("../../lib/audit.js");
    await expect(
      logAudit({ action: "CREATE", entite: "Produit" }),
    ).resolves.toBeUndefined();
  });

  it("works with all valid action types", async () => {
    const { logAudit } = await import("../../lib/audit.js");
    const actions = [
      "LOGIN_SUCCESS",
      "LOGIN_FAILED",
      "LOGIN_BLOCKED",
      "LOGOUT",
      "CREATE_VENTE",
      "ANNULER_VENTE",
      "CREATE_FACTURE",
      "EMIT_FACTURE",
      "CLOTURE_CAISSE",
    ] as const;
    for (const action of actions) {
      await expect(
        logAudit({ action, entite: "Test" }),
      ).resolves.toBeUndefined();
    }
    expect(mockCreate).toHaveBeenCalledTimes(actions.length);
  });
});
