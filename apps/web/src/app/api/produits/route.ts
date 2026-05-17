import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { produitSchema } from '@/lib/validations/produit'
import { logAudit } from '@/lib/audit'

export async function GET(req: Request) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const actif = searchParams.get('actif')
  const categorieId = searchParams.get('categorieId')
  const search = searchParams.get('q')

  const produits = await prisma.produit.findMany({
    where: {
      ...(actif !== null && { actif: actif === 'true' }),
      ...(categorieId && { categorieId }),
      ...(search && { nom: { contains: search, mode: 'insensitive' } }),
    },
    include: {
      categorie: true,
      variantes: {
        where: { actif: true },
        orderBy: { poids: 'asc' },
      },
    },
    orderBy: { nom: 'asc' },
  })

  return NextResponse.json(produits)
}

export async function POST(req: Request) {
  const { error, session } = await requireAuth(['GERANT'])
  if (error) return error

  const body = await req.json()
  const parsed = produitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const produit = await prisma.produit.create({
    data: {
      nom: parsed.data.nom,
      categorieId: parsed.data.categorieId ?? null,
      description: parsed.data.description ?? null,
      image: parsed.data.image ?? null,
      actif: parsed.data.actif,
    },
    include: { categorie: true, variantes: true },
  })

  await logAudit({
    userId: session!.user.id,
    action: 'CREATE',
    entite: 'Produit',
    entiteId: produit.id,
    nouvelleValeur: parsed.data as Record<string, unknown>,
  })

  return NextResponse.json(produit, { status: 201 })
}
