import { NextResponse } from 'next/server'
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

  const existing = await prisma.produit.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })

  // Désactivation produit → cascade sur toutes les variantes
  const [produit] = await prisma.$transaction([
    prisma.produit.update({ where: { id }, data: { actif } }),
    ...(actif === false
      ? [prisma.varianteProduit.updateMany({ where: { produitId: id }, data: { actif: false } })]
      : []),
  ])

  await logAudit({
    userId: session!.user.id,
    action: actif ? 'ACTIVATE' : 'DEACTIVATE',
    entite: 'Produit',
    entiteId: id,
    ancienneValeur: { actif: existing.actif },
    nouvelleValeur: { actif },
  })

  return NextResponse.json(produit)
}
