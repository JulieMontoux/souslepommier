import { prisma } from '@/lib/prisma'
import { ClientList } from '@/components/clients/client-list'
import type { ClientComplet } from '@/types/client'

export const metadata = { title: 'Clients — Sous le Pommier' }

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({ orderBy: { raisonSociale: 'asc' } })

  const serialised: ClientComplet[] = clients.map((c) => ({
    ...c,
    conditionsPaiement: Number(c.conditionsPaiement),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }))

  return <ClientList clients={serialised} />
}
