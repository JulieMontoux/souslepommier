import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(['GERANT'])
  if (error) return error

  const { id } = await params

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const [ventesMois, ventesWeek, ventesTotal] = await Promise.all([
    prisma.vente.aggregate({
      where: { vendeurId: id, date: { gte: startOfMonth }, statut: 'FINALISEE' },
      _count: { id: true },
      _sum: { totalHT: true, totalTTC: true },
    }),
    prisma.vente.aggregate({
      where: { vendeurId: id, date: { gte: startOfWeek }, statut: 'FINALISEE' },
      _sum: { totalHT: true, totalTTC: true },
    }),
    prisma.vente.count({ where: { vendeurId: id, statut: 'FINALISEE' } }),
  ])

  return NextResponse.json({
    nbVentesMois: ventesMois._count.id,
    nbVentesTotal: ventesTotal,
    caMoisHT: Number(ventesMois._sum.totalHT ?? 0),
    caMoisTTC: Number(ventesMois._sum.totalTTC ?? 0),
    caWeekHT: Number(ventesWeek._sum.totalHT ?? 0),
    caWeekTTC: Number(ventesWeek._sum.totalTTC ?? 0),
  })
}
