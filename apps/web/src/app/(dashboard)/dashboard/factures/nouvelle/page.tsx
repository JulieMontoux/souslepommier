import { prisma } from '@/lib/prisma'
import { FactureForm } from '@/components/factures/facture-form'
import type { ClientComplet } from '@/types/client'

export const metadata = { title: 'Nouvelle facture — Sous le Pommier' }

export default async function NouvelleFacturePage() {
  const clients = await prisma.client.findMany({
    where: { actif: true },
    orderBy: { raisonSociale: 'asc' },
  })

  const serialised: ClientComplet[] = clients.map((c) => ({
    ...c,
    conditionsPaiement: Number(c.conditionsPaiement),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }))

  return <FactureForm clients={serialised} />
}
