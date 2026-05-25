import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { venteCreateSchema } from '@/lib/validations/vente'
import { logAudit } from '@/lib/audit'
import { createVente } from '@/lib/create-vente'

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const vendeurId = searchParams.get('vendeurId')
  const statut = searchParams.get('statut')
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = parseInt(searchParams.get('limit') ?? '50', 10)
  const skip = (page - 1) * limit

  const where = {
    ...(vendeurId && { vendeurId }),
    ...(statut && { statut: statut as 'OUVERTE' | 'FINALISEE' | 'ANNULEE' }),
    ...((from || to) && {
      date: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    }),
  }

  const [total, items] = await Promise.all([
    prisma.vente.count({ where }),
    prisma.vente.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        vendeur: { select: { id: true, nom: true, prenom: true } },
        _count: { select: { lignes: true } },
      },
    }),
  ])

  return NextResponse.json({
    data: items,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
}

export async function POST(req: Request) {
  const { error, session } = await requireAuth()
  if (error) return error
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const parsed = venteCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const vendeurId = (session.user as { id?: string })?.id
  if (!vendeurId) return NextResponse.json({ error: 'Vendeur introuvable' }, { status: 401 })

  try {
    const vente = await createVente(vendeurId, parsed.data.lignes, parsed.data.paiements)

    await logAudit({
      userId: vendeurId,
      action: 'CREATE_VENTE',
      entite: 'Vente',
      entiteId: vente.id,
      nouvelleValeur: { numeroTicket: vente.numeroTicket, totalTTC: vente.totalTTC } as Record<
        string,
        unknown
      >,
    })

    return NextResponse.json(vente, { status: 201 })
  } catch (err) {
    const e = err as Error & { status?: number }
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 })
  }
}
