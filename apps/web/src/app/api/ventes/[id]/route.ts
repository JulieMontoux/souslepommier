import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params

  const vente = await prisma.vente.findUnique({
    where: { id },
    include: {
      vendeur: { select: { id: true, nom: true, prenom: true } },
      lignes: {
        include: { variante: { include: { produit: true } } },
      },
      paiements: true,
      factures: { select: { id: true, numero: true, statut: true } },
    },
  })

  if (!vente) {
    return NextResponse.json({ error: 'Vente introuvable' }, { status: 404 })
  }

  return NextResponse.json(vente)
}
