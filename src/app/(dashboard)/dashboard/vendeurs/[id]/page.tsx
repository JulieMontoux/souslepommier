import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { VendeurDetailView } from '@/components/users/vendeur-detail'
import type { UserDetail } from '@/types/user'

export const metadata = { title: 'Vendeur — Sous le Pommier' }

export default async function VendeurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, auth()])

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      prenom: true,
      nom: true,
      role: true,
      actif: true,
      lastLoginAt: true,
      createdAt: true,
    },
  })

  if (!user) notFound()

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

  const detail: UserDetail = {
    id: user.id,
    email: user.email,
    prenom: user.prenom,
    nom: user.nom,
    role: user.role as UserDetail['role'],
    actif: user.actif,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    nbVentesMois: ventesMois._count.id,
    nbVentesTotal: ventesTotal,
    caMoisHT: Number(ventesMois._sum.totalHT ?? 0),
    caMoisTTC: Number(ventesMois._sum.totalTTC ?? 0),
    caWeekHT: Number(ventesWeek._sum.totalHT ?? 0),
    caWeekTTC: Number(ventesWeek._sum.totalTTC ?? 0),
  }

  const currentUserId = (session?.user as { id?: string })?.id

  return <VendeurDetailView user={detail} isSelf={currentUserId === id} />
}
