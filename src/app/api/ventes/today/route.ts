import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)

  const ventes = await prisma.vente.findMany({
    where: { date: { gte: startOfDay } },
    include: {
      vendeur: { select: { id: true, nom: true, prenom: true } },
      lignes: {
        include: { variante: { include: { produit: true } } },
      },
      paiements: true,
    },
    orderBy: { date: 'asc' },
  })

  return NextResponse.json(ventes)
}
