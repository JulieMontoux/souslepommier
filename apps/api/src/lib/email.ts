import nodemailer from "nodemailer";
import { prisma } from "./prisma.js";

const CONFIG_ID = "default";

async function getTransport() {
  const config = await prisma.configEntreprise.findUnique({
    where: { id: CONFIG_ID },
    select: {
      smtpHost: true,
      smtpPort: true,
      smtpUser: true,
      smtpPass: true,
      smtpTls: true,
    },
  });

  const host = config?.smtpHost ?? process.env.EMAIL_SERVER_HOST;
  const port =
    config?.smtpPort ?? parseInt(process.env.EMAIL_SERVER_PORT ?? "587");
  const user = config?.smtpUser ?? process.env.EMAIL_SERVER_USER;
  const pass = config?.smtpPass ?? process.env.EMAIL_SERVER_PASSWORD;
  const secure = config?.smtpTls ?? false;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function getFrom() {
  const config = await prisma.configEntreprise.findUnique({
    where: { id: CONFIG_ID },
    select: { smtpFrom: true, raisonSociale: true },
  });
  if (config?.smtpFrom) return config.smtpFrom;
  const name = config?.raisonSociale ?? "Sous le Pommier";
  return process.env.EMAIL_FROM ?? `${name} <noreply@example.com>`;
}

export async function sendWelcomeEmail(
  to: string,
  prenom: string,
  password: string,
) {
  const [transport, from] = await Promise.all([getTransport(), getFrom()]);
  await transport.sendMail({
    from,
    to,
    subject: "Bienvenue — Vos accès Sous le Pommier",
    text: `Bonjour ${prenom},\n\nVotre compte vendeur a été créé.\n\nEmail    : ${to}\nMot de passe : ${password}\n\nConnectez-vous sur l'application pour démarrer.\n\nCordialement,\nSous le Pommier`,
  });
}

export async function sendResetPasswordEmail(
  to: string,
  prenom: string,
  password: string,
) {
  const [transport, from] = await Promise.all([getTransport(), getFrom()]);
  await transport.sendMail({
    from,
    to,
    subject: "Réinitialisation de mot de passe — Sous le Pommier",
    text: `Bonjour ${prenom},\n\nVotre mot de passe a été réinitialisé.\n\nNouveau mot de passe : ${password}\n\nCordialement,\nSous le Pommier`,
  });
}

export async function sendForgotPasswordEmail(
  to: string,
  prenom: string,
  resetUrl: string,
) {
  const [transport, from] = await Promise.all([getTransport(), getFrom()]);
  await transport.sendMail({
    from,
    to,
    subject: "Réinitialisation de mot de passe — Sous le Pommier",
    text: `Bonjour ${prenom},\n\nVous avez demandé la réinitialisation de votre mot de passe.\n\nCliquez sur le lien ci-dessous (valable 1 heure) :\n${resetUrl}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\nCordialement,\nSous le Pommier`,
  });
}

export async function sendTestEmail(to: string) {
  const [transport, from] = await Promise.all([getTransport(), getFrom()]);
  await transport.sendMail({
    from,
    to,
    subject: "Test SMTP — Sous le Pommier",
    text: "Configuration SMTP opérationnelle. Ce message confirme que l'envoi d'email fonctionne correctement.",
  });
}
