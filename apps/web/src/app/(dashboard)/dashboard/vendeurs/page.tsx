import { prisma } from '@/lib/prisma'
import { VendeurList } from '@/components/users/vendeur-list'
import type { UserSummary } from '@/types/user'

export const metadata = { title: 'Vendeurs — Sous le Pommier' }

export default async function VendeursPage() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const users = await prisma.user.findMany({
    orderBy: [{ actif: 'desc' }, { nom: 'asc' }],
    select: {
      id: true,
      email: true,
      prenom: true,
      nom: true,
      role: true,
      actif: true,
      lastLoginAt: true,
      createdAt: true,
      _count: {
        select: { ventes: { where: { date: { gte: startOfMonth }, statut: 'FINALISEE' } } },
      },
    },
  })

  const serialised: UserSummary[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    prenom: u.prenom,
    nom: u.nom,
    role: u.role as UserSummary['role'],
    actif: u.actif,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
    nbVentesMois: u._count.ventes,
  }))

  return <VendeurList users={serialised} />
}
