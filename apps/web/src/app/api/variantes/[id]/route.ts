import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { z } from 'zod'
import { apiProxy } from '@/lib/api-proxy'

const updateVarianteSchema = z.object({
  prixHT: z.number().min(0).optional(),
  tauxTVA: z.number().min(0).optional(),
  emballage: z.enum(['VRAC', 'BARQUETTE', 'FILET', 'SAC', 'CAISSE', 'PLATEAU']).optional(),
  poids: z.number().min(0).optional(),
  sku: z.string().optional(),
})

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error
  const session = authResult.session
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const variante = await apiProxy(`/api/variantes/${params.id}`)
    return NextResponse.json(variante)
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(['GERANT'])
  if (authResult.error) return authResult.error
  const session = authResult.session
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = updateVarianteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.format() },
      { status: 422 }
    )
  }

  try {
    const variante = await apiProxy(`/api/variantes/${params.id}`, {
      method: 'PUT',
      body: parsed.data,
    })
    return NextResponse.json(variante)
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(['GERANT'])
  if (authResult.error) return authResult.error
  const session = authResult.session
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()
  // For toggle actif, we expect { actif: boolean }
  const toggleSchema = z.object({
    actif: z.boolean(),
  })
  const parsed = toggleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.format() },
      { status: 422 }
    )
  }

  try {
    const variante = await apiProxy(`/api/variantes/${params.id}/statut`, {
      method: 'PATCH',
      body: parsed.data,
    })
    return NextResponse.json(variante)
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
