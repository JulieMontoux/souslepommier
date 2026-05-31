import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendMail = vi.fn().mockResolvedValue({ messageId: "test-id" });
const mockCreateTransport = vi.fn().mockReturnValue({ sendMail: mockSendMail });
const mockConfigFindUnique = vi.fn();

vi.mock("nodemailer", () => ({
  default: { createTransport: mockCreateTransport },
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: { configEntreprise: { findUnique: mockConfigFindUnique } },
}));

const DB_CONFIG = {
  smtpHost: "smtp.test.com",
  smtpPort: 587,
  smtpUser: "test@test.com",
  smtpPass: "secret",
  smtpTls: false,
  smtpFrom: "SLP <noreply@test.com>",
  raisonSociale: "Test GAEC",
};

beforeEach(() => {
  mockSendMail.mockClear();
  mockCreateTransport.mockClear();
  mockConfigFindUnique.mockResolvedValue(DB_CONFIG);
});

describe("sendWelcomeEmail", () => {
  it("sends mail with correct subject and prenom", async () => {
    const { sendWelcomeEmail } = await import("../../lib/email.js");
    await sendWelcomeEmail("julie@test.com", "Julie", "pwd123");
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "julie@test.com",
        subject: expect.stringContaining("Bienvenue"),
        text: expect.stringContaining("Julie"),
      }),
    );
  });

  it("uses from address from DB config", async () => {
    const { sendWelcomeEmail } = await import("../../lib/email.js");
    await sendWelcomeEmail("x@test.com", "X", "pwd");
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: "SLP <noreply@test.com>" }),
    );
  });

  it("falls back to raisonSociale when smtpFrom null", async () => {
    mockConfigFindUnique.mockResolvedValue({ ...DB_CONFIG, smtpFrom: null });
    const { sendWelcomeEmail } = await import("../../lib/email.js");
    await sendWelcomeEmail("x@test.com", "X", "pwd");
    const call = mockSendMail.mock.calls[0][0];
    expect(call.from).toContain("Test GAEC");
  });

  it("falls back to env when config is null", async () => {
    mockConfigFindUnique.mockResolvedValue(null);
    process.env.EMAIL_SERVER_HOST = "smtp.env.com";
    process.env.EMAIL_SERVER_PORT = "465";
    const { sendWelcomeEmail } = await import("../../lib/email.js");
    await sendWelcomeEmail("x@test.com", "X", "pwd");
    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: "smtp.env.com", port: 465 }),
    );
    delete process.env.EMAIL_SERVER_HOST;
    delete process.env.EMAIL_SERVER_PORT;
  });
});

describe("sendResetPasswordEmail", () => {
  it("includes new password in body", async () => {
    const { sendResetPasswordEmail } = await import("../../lib/email.js");
    await sendResetPasswordEmail("test@test.com", "Jean", "newpass456");
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("newpass456"),
        subject: expect.stringContaining("Réinitialisation"),
      }),
    );
  });
});

describe("sendForgotPasswordEmail", () => {
  it("includes reset URL in body", async () => {
    const { sendForgotPasswordEmail } = await import("../../lib/email.js");
    const url = "https://app.example.com/reset?token=abc123";
    await sendForgotPasswordEmail("user@test.com", "Marie", url);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining(url) }),
    );
  });
});

describe("sendTestEmail", () => {
  it("sends SMTP test email", async () => {
    const { sendTestEmail } = await import("../../lib/email.js");
    await sendTestEmail("admin@test.com");
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "admin@test.com",
        subject: expect.stringContaining("Test SMTP"),
      }),
    );
  });

  it("uses DB SMTP config for transport", async () => {
    const { sendTestEmail } = await import("../../lib/email.js");
    await sendTestEmail("admin@test.com");
    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: "smtp.test.com", port: 587 }),
    );
  });
});
