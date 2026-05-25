import { NextResponse } from 'next/server'
import { updateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { produitSchema } from '@/lib/validations/produit'
import { logAudit } from '@/lib/audit'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const produit = await prisma.produit.findUnique({
    where: { id },
    include: {
      categorie: true,
      variantes: { orderBy: { poids: 'asc' } },
    },
  })
  if (!produit) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
  return NextResponse.json(produit)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth(['GERANT'])
  if (error) return error

  const { id } = await params
  const body = await req.json()
  const parsed = produitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const existing = await prisma.produit.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })

  const produit = await prisma.produit.update({
    where: { id },
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
    action: 'UPDATE',
    entite: 'Produit',
    entiteId: id,
    ancienneValeur: existing as Record<string, unknown>,
    nouvelleValeur: parsed.data as Record<string, unknown>,
  })

  updateTag('produits')
  return NextResponse.json(produit)
}
