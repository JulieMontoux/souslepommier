import { NextResponse } from 'next/server'
import { updateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth(['GERANT'])
  if (error) return error

  const { id } = await params
  const body = await req.json()
  const actif: boolean = body.actif

  if (typeof actif !== 'boolean') {
    return NextResponse.json({ error: 'Champ actif (boolean) requis' }, { status: 422 })
  }

  const existing = await prisma.varianteProduit.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Variante introuvable' }, { status: 404 })

  const variante = await prisma.varianteProduit.update({ where: { id }, data: { actif } })

  await logAudit({
    userId: session!.user.id,
    action: actif ? 'ACTIVATE' : 'DEACTIVATE',
    entite: 'VarianteProduit',
    entiteId: id,
    ancienneValeur: { actif: existing.actif },
    nouvelleValeur: { actif },
  })

  updateTag('produits')
  return NextResponse.json(variante)
}
