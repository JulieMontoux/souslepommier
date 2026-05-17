import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { userUpdateSchema } from '@/lib/validations/user'
import { logAudit } from '@/lib/audit'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(['GERANT'])
  if (error) return error

  const { id } = await params

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      prenom: true,
      nom: true,
      role: true,
      actif: true,
      lastLoginAt: true,
      createdAt: true,
    },
  })

  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

  const [ventesMois, ventesWeek, ventesTotal] = await Promise.all([
    prisma.vente.aggregate({
      where: { vendeurId: id, date: { gte: startOfMonth }, statut: 'FINALISEE' },
      _count: { id: true },
      _sum: { totalHT: true, totalTTC: true },
    }),
    prisma.vente.aggregate({
      where: { vendeurId: id, date: { gte: startOfWeek }, statut: 'FINALISEE' },
      _sum: { totalHT: true, totalTTC: true },
    }),
    prisma.vente.count({ where: { vendeurId: id, statut: 'FINALISEE' } }),
  ])

  return NextResponse.json({
    ...user,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    nbVentesMois: ventesMois._count.id,
    nbVentesTotal: ventesTotal,
    caMoisHT: Number(ventesMois._sum.totalHT ?? 0),
    caMoisTTC: Number(ventesMois._sum.totalTTC ?? 0),
    caWeekHT: Number(ventesWeek._sum.totalHT ?? 0),
    caWeekTTC: Number(ventesWeek._sum.totalTTC ?? 0),
  })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth(['GERANT'])
  if (error) return error

  const { id } = await params
  const body = await req.json()
  const parsed = userUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

  if (parsed.data.email) {
    const emailTaken = await prisma.user.findFirst({
      where: { email: parsed.data.email, id: { not: id } },
      select: { id: true },
    })
    if (emailTaken) return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })
  }

  const user = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: { id: true, email: true, prenom: true, nom: true, role: true },
  })

  const userId = (session?.user as { id?: string })?.id
  await logAudit({
    userId,
    action: 'UPDATE_USER',
    entite: 'User',
    entiteId: id,
    nouvelleValeur: parsed.data as Record<string, unknown>,
  })

  return NextResponse.json(user)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth(['GERANT'])
  if (error) return error

  const { id } = await params
  const gerantId = (session?.user as { id?: string })?.id

  if (id === gerantId) {
    return NextResponse.json(
      { error: 'Impossible de supprimer son propre compte' },
      { status: 409 }
    )
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } })
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

  const emailHash = createHash('sha256').update(user.email).digest('hex')
  await prisma.user.update({
    where: { id },
    data: {
      nom: 'Utilisateur supprimé',
      prenom: '',
      email: `deleted_${emailHash}@anonymised`,
      actif: false,
      passwordHash: '',
    },
  })

  await logAudit({
    userId: gerantId,
    action: 'DELETE_USER_RGPD',
    entite: 'User',
    entiteId: id,
    nouvelleValeur: { anonymised: true },
  })

  return new Response(null, { status: 204 })
}
