import { NextResponse } from 'next/server'
import { updateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { categorieSchema } from '@/lib/validations/produit'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const categories = await prisma.categorie.findMany({ orderBy: { nom: 'asc' } })
  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  const { error } = await requireAuth(['GERANT'])
  if (error) return error

  const body = await req.json()
  const parsed = categorieSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const categorie = await prisma.categorie.upsert({
    where: { nom: parsed.data.nom },
    update: {},
    create: { nom: parsed.data.nom },
  })
  updateTag('categories')
  return NextResponse.json(categorie, { status: 201 })
}
