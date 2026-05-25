import nodemailer from "nodemailer";

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT ?? "587"),
    secure: false,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });
}

const FROM = process.env.EMAIL_FROM ?? "Sous le Pommier <noreply@example.com>";

export async function sendWelcomeEmail(
  to: string,
  prenom: string,
  password: string,
) {
  await getTransport().sendMail({
    from: FROM,
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
  await getTransport().sendMail({
    from: FROM,
    to,
    subject: "Réinitialisation de mot de passe — Sous le Pommier",
    text: `Bonjour ${prenom},\n\nVotre mot de passe a été réinitialisé.\n\nNouveau mot de passe : ${password}\n\nCordialement,\nSous le Pommier`,
  });
}
