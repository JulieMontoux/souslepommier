import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { varianteSchema } from '@/lib/validations/produit'
import { calcPrixTTC } from '@/lib/tva'
import { generateSKU } from '@/lib/sku'
import { logAudit } from '@/lib/audit'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const variantes = await prisma.varianteProduit.findMany({
    where: { produitId: id },
    orderBy: { poids: 'asc' },
  })
  return NextResponse.json(variantes)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth(['GERANT'])
  if (error) return error

  const { id: produitId } = await params
  const produit = await prisma.produit.findUnique({ where: { id: produitId } })
  if (!produit) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })

  const body = await req.json()
  const parsed = varianteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { poids, emballage, prixHT, tauxTVA, actif } = parsed.data
  const prixTTC = calcPrixTTC(prixHT, tauxTVA)

  // SKU auto si non fourni
  let sku = parsed.data.sku?.trim() || null
  if (!sku) {
    const baseSKU = generateSKU(produit.nom, poids ?? null, emballage)
    // Assurer l'unicité en ajoutant un suffixe si nécessaire
    let candidate = baseSKU
    let suffix = 1
    while (await prisma.varianteProduit.findUnique({ where: { sku: candidate } })) {
      candidate = `${baseSKU}-${suffix++}`
    }
    sku = candidate
  }

  const variante = await prisma.varianteProduit.create({
    data: {
      produitId,
      poids: poids ?? null,
      emballage,
      prixHT,
      tauxTVA,
      prixTTC,
      sku,
      actif,
    },
  })

  await logAudit({
    userId: session!.user.id,
    action: 'CREATE',
    entite: 'VarianteProduit',
    entiteId: variante.id,
    nouvelleValeur: { produitId, poids, emballage, prixHT, tauxTVA, prixTTC, sku },
  })

  return NextResponse.json(variante, { status: 201 })
}
