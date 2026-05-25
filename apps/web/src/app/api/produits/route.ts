import { NextResponse } from 'next/server'
import { updateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { produitSchema } from '@/lib/validations/produit'
import { logAudit } from '@/lib/audit'

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? searchParams.get('q') ?? undefined
  const categorieId = searchParams.get('categorieId') ?? undefined
  const actifParam = searchParams.get('actif')
  const actif = actifParam === 'true' ? true : actifParam === 'false' ? false : undefined

  const produits = await prisma.produit.findMany({
    where: {
      ...(search && { nom: { contains: search, mode: 'insensitive' } }),
      ...(categorieId && { categorieId }),
      ...(actif !== undefined && { actif }),
    },
    include: {
      categorie: { select: { id: true, nom: true } },
      variantes: {
        where: actif !== undefined ? { actif } : undefined,
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
      ...(parsed.data.categorieId && { categorieId: parsed.data.categorieId }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(parsed.data.image !== undefined && { image: parsed.data.image }),
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

  updateTag('produits')
  return NextResponse.json(produit, { status: 201 })
}
