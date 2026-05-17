import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { userCreateSchema } from '@/lib/validations/user'
import { sendWelcomeEmail } from '@/lib/email'
import { logAudit } from '@/lib/audit'

export async function GET(_req: Request) {
  const { error } = await requireAuth(['GERANT'])
  if (error) return error

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const users = await prisma.user.findMany({
    orderBy: [{ actif: 'desc' }, { nom: 'asc' }],
    select: {
      id: true,
      email: true,
      prenom: true,
      nom: true,
      role: true,
      actif: true,
      lastLoginAt: true,
      createdAt: true,
      _count: {
        select: { ventes: { where: { date: { gte: startOfMonth }, statut: 'FINALISEE' } } },
      },
    },
  })

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      prenom: u.prenom,
      nom: u.nom,
      role: u.role,
      actif: u.actif,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      nbVentesMois: u._count.ventes,
    }))
  )
}

export async function POST(req: Request) {
  const { error, session } = await requireAuth(['GERANT'])
  if (error) return error

  const body = await req.json()
  const parsed = userCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { email, prenom, nom, role } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })
  }

  const password = randomBytes(6).toString('base64url').slice(0, 10)
  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { email, prenom, nom, role, passwordHash },
    select: { id: true, email: true, prenom: true, nom: true, role: true, createdAt: true },
  })

  const userId = (session?.user as { id?: string })?.id
  await logAudit({
    userId,
    action: 'CREATE_USER',
    entite: 'User',
    entiteId: user.id,
    nouvelleValeur: { email, prenom, nom, role },
  })

  try {
    await sendWelcomeEmail(email, prenom, password)
  } catch {
    // Email failure non-bloquant — user already created
  }

  return NextResponse.json(user, { status: 201 })
}
