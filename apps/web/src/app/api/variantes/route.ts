import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { z } from 'zod'
import { apiProxy } from '@/lib/api-proxy'
import type { VarianteProduit } from '@souslepommier/database'

const createVarianteSchema = z.object({
  prixHT: z.number().min(0),
  tauxTVA: z.number().min(0),
  emballage: z.enum(['VRAC', 'BARQUETTE', 'FILET', 'SAC', 'CAISSE', 'PLATEAU']).optional(),
  poids: z.number().min(0).optional(),
  sku: z.string().optional(),
})

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const produitId = searchParams.get('produitId')

  const params = new URLSearchParams()
  if (produitId !== null && produitId !== '') params.append('produitId', produitId)

  try {
    const variantes = await apiProxy<VarianteProduit[]>(`/api/variantes?${params.toString()}`)
    return NextResponse.json(variantes)
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { error } = await requireAuth(['GERANT'])
  if (error) return error

  const body = await req.json()
  const parsed = createVarianteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.format() },
      { status: 422 }
    )
  }

  const produitId = body.produitId
  if (!produitId) {
    return NextResponse.json({ error: 'produitId is required' }, { status: 400 })
  }

  try {
    const variante = await apiProxy<VarianteProduit>(`/api/produits/${produitId}/variantes`, {
      method: 'POST',
      body: parsed.data,
    })

    return NextResponse.json(variante, { status: 201 })
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
