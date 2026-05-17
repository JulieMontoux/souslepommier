import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { sendResetPasswordEmail } from '@/lib/email'
import { logAudit } from '@/lib/audit'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth(['GERANT'])
  if (error) return error

  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, prenom: true, actif: true },
  })

  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  if (!user.actif) return NextResponse.json({ error: 'Utilisateur inactif' }, { status: 409 })

  const password = randomBytes(6).toString('base64url').slice(0, 10)
  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.update({ where: { id }, data: { passwordHash } })

  const gerantId = (session?.user as { id?: string })?.id
  await logAudit({
    userId: gerantId,
    action: 'RESET_PASSWORD',
    entite: 'User',
    entiteId: id,
    nouvelleValeur: {},
  })

  try {
    await sendResetPasswordEmail(user.email, user.prenom, password)
  } catch {
    // Email failure non-bloquant — password already reset
  }

  return NextResponse.json({ ok: true })
}
