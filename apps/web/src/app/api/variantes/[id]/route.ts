import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { varianteSchema } from '@/lib/validations/produit'
import { calcPrixTTC } from '@/lib/tva'
import { logAudit } from '@/lib/audit'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth(['GERANT'])
  if (error) return error

  const { id } = await params
  const existing = await prisma.varianteProduit.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Variante introuvable' }, { status: 404 })

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

  // SKU : conserver l'existant si non fourni
  const sku = parsed.data.sku?.trim() || existing.sku

  const variante = await prisma.varianteProduit.update({
    where: { id },
    data: { poids: poids ?? null, emballage, prixHT, tauxTVA, prixTTC, sku, actif },
  })

  await logAudit({
    userId: session!.user.id,
    action: 'UPDATE',
    entite: 'VarianteProduit',
    entiteId: id,
    ancienneValeur: existing as Record<string, unknown>,
    nouvelleValeur: { poids, emballage, prixHT, tauxTVA, prixTTC },
  })

  return NextResponse.json(variante)
}
