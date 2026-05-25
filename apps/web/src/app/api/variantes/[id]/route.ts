import { NextResponse } from 'next/server'
import { updateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { z } from 'zod'
import { calcPrixTTC } from '@/lib/tva'

const updateVarianteSchema = z.object({
  prixHT: z.number().min(0).optional(),
  tauxTVA: z.number().min(0).optional(),
  emballage: z.enum(['VRAC', 'BARQUETTE', 'FILET', 'SAC', 'CAISSE', 'PLATEAU']).optional(),
  poids: z.number().min(0).optional(),
  sku: z.string().optional(),
})

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await context.params
  const variante = await prisma.varianteProduit.findUnique({ where: { id } })
  if (!variante) return NextResponse.json({ error: 'Variante introuvable' }, { status: 404 })
  return NextResponse.json(variante)
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(['GERANT'])
  if (error) return error

  const { id } = await context.params
  const body = await req.json()
  const parsed = updateVarianteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.format() },
      { status: 422 }
    )
  }

  const existing = await prisma.varianteProduit.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Variante introuvable' }, { status: 404 })

  const prixHT = parsed.data.prixHT !== undefined ? parsed.data.prixHT : Number(existing.prixHT)
  const tauxTVA = parsed.data.tauxTVA !== undefined ? parsed.data.tauxTVA : Number(existing.tauxTVA)
  const prixTTC = calcPrixTTC(prixHT, tauxTVA)

  const variante = await prisma.varianteProduit.update({
    where: { id },
    data: {
      prixHT,
      tauxTVA,
      prixTTC,
      ...(parsed.data.emballage !== undefined && { emballage: parsed.data.emballage }),
      ...(parsed.data.poids !== undefined && { poids: parsed.data.poids }),
      ...(parsed.data.sku !== undefined && { sku: parsed.data.sku }),
    },
  })

  updateTag('produits')
  return NextResponse.json(variante)
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(['GERANT'])
  if (error) return error

  const { id } = await context.params
  const body = await req.json()
  const parsed = z.object({ actif: z.boolean() }).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.format() },
      { status: 422 }
    )
  }

  const existing = await prisma.varianteProduit.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Variante introuvable' }, { status: 404 })

  const variante = await prisma.varianteProduit.update({
    where: { id },
    data: { actif: parsed.data.actif },
  })

  updateTag('produits')
  return NextResponse.json(variante)
}
