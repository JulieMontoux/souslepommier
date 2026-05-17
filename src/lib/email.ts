import nodemailer from 'nodemailer'

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT ?? '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  })
}

const FROM = process.env.EMAIL_FROM ?? 'Sous le Pommier <noreply@example.com>'

export async function sendWelcomeEmail(to: string, prenom: string, password: string) {
  const transport = getTransport()
  await transport.sendMail({
    from: FROM,
    to,
    subject: 'Bienvenue — Vos accès Sous le Pommier',
    text: [
      `Bonjour ${prenom},`,
      '',
      'Votre compte vendeur a été créé.',
      '',
      `Email    : ${to}`,
      `Mot de passe : ${password}`,
      '',
      'Connectez-vous sur : ' + (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
      'Changez votre mot de passe après la première connexion.',
    ].join('\n'),
    html: `
      <p>Bonjour ${prenom},</p>
      <p>Votre compte vendeur a été créé.</p>
      <table>
        <tr><td><strong>Email</strong></td><td>${to}</td></tr>
        <tr><td><strong>Mot de passe</strong></td><td><code>${password}</code></td></tr>
      </table>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}">Se connecter</a></p>
      <p>Changez votre mot de passe après la première connexion.</p>
    `,
  })
}

export async function sendResetPasswordEmail(to: string, prenom: string, password: string) {
  const transport = getTransport()
  await transport.sendMail({
    from: FROM,
    to,
    subject: 'Réinitialisation de mot de passe — Sous le Pommier',
    text: [
      `Bonjour ${prenom},`,
      '',
      'Votre mot de passe a été réinitialisé.',
      '',
      `Nouveau mot de passe : ${password}`,
      '',
      'Connectez-vous sur : ' + (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
    ].join('\n'),
    html: `
      <p>Bonjour ${prenom},</p>
      <p>Votre mot de passe a été réinitialisé.</p>
      <p><strong>Nouveau mot de passe :</strong> <code>${password}</code></p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}">Se connecter</a></p>
    `,
  })
}
