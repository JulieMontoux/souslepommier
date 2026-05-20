import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { produitSchema } from '@/lib/validations/produit'
import { logAudit } from '@/lib/audit'
import { apiProxy } from '@/lib/api-proxy'
import type { Produit } from '@souslepommier/database'

export async function GET(req: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error
  const session = authResult.session
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const actif = searchParams.get('actif')
  const categorieId = searchParams.get('categorieId')
  const search = searchParams.get('q')

  // Build query parameters for NestJS API
  const params = new URLSearchParams()
  if (search !== null && search !== '') params.append('search', search)
  if (categorieId !== null && categorieId !== '') params.append('categorieId', categorieId)
  if (actif !== null) params.append('actif', actif)

  try {
    const produits = await apiProxy<Produit[]>(`/api/produits?${params.toString()}`)
    return NextResponse.json(produits)
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const authResult = await requireAuth(['GERANT'])
  if (authResult.error) return authResult.error
  const session = authResult.session
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = produitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  try {
    const produit = await apiProxy<Produit>(`/api/produits`, {
      method: 'POST',
      body: parsed.data,
    })

    await logAudit({
      userId: session!.user.id,
      action: 'CREATE',
      entite: 'Produit',
      entiteId: produit.id,
      nouvelleValeur: parsed.data as Record<string, unknown>,
    })

    return NextResponse.json(produit, { status: 201 })
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
