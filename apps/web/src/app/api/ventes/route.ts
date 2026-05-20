import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { venteCreateSchema } from '@/lib/validations/vente'
import { logAudit } from '@/lib/audit'
import { apiProxy } from '@/lib/api-proxy'
import type { Vente } from '@souslepommier/database'

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const vendeurId = searchParams.get('vendeurId')
  const statut = searchParams.get('statut')
  const page = searchParams.get('page')
  const limit = searchParams.get('limit')

  const params = new URLSearchParams()
  if (dateParam !== null) params.append('date', dateParam)
  if (from !== null) params.append('from', from)
  if (to !== null) params.append('to', to)
  if (vendeurId !== null) params.append('vendeurId', vendeurId)
  if (statut !== null) params.append('statut', statut)
  if (page !== null) params.append('page', page)
  if (limit !== null) params.append('limit', limit)

  try {
    const ventes = await apiProxy<Vente[]>(`/api/ventes?${params.toString()}`)
    return NextResponse.json(ventes)
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { error, session } = await requireAuth()
  if (error) return error
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = venteCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  try {
    const vente = await apiProxy<Vente>(`/api/ventes`, {
      method: 'POST',
      body: {
        ...parsed.data,
        vendeurId: (session.user as { id?: string })?.id,
      },
    })

    const userId = (session.user as { id?: string })?.id
    await logAudit({
      userId,
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
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
