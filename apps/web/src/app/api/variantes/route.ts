import { NextResponse } from 'next/server'
import { updateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { z } from 'zod'
import { calcPrixTTC } from '@/lib/tva'

const createVarianteSchema = z.object({
  produitId: z.string().min(1),
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
  const produitId = searchParams.get('produitId') ?? undefined

  const variantes = await prisma.varianteProduit.findMany({
    where: produitId ? { produitId } : {},
    orderBy: { poids: 'asc' },
  })

  return NextResponse.json(variantes)
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

  const { produitId, prixHT, tauxTVA, emballage, poids, sku } = parsed.data

  const produit = await prisma.produit.findUnique({ where: { id: produitId } })
  if (!produit) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })

  const prixTTC = calcPrixTTC(prixHT, tauxTVA)

  const variante = await prisma.varianteProduit.create({
    data: {
      produitId,
      prixHT,
      tauxTVA,
      prixTTC,
      emballage: (emballage ?? 'VRAC') as
        | 'VRAC'
        | 'BARQUETTE'
        | 'FILET'
        | 'SAC'
        | 'CAISSE'
        | 'PLATEAU',
      ...(poids !== undefined && { poids }),
      ...(sku !== undefined && { sku }),
    },
  })

  updateTag('produits')
  return NextResponse.json(variante, { status: 201 })
}
