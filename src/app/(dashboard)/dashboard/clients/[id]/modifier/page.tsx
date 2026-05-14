import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ClientForm } from '@/components/clients/client-form'
import type { ClientComplet } from '@/types/client'

export const metadata = { title: 'Modifier client — Sous le Pommier' }

export default async function ModifierClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = await prisma.client.findUnique({ where: { id } })
  if (!client) notFound()

  const serialised: ClientComplet = {
    ...client,
    conditionsPaiement: Number(client.conditionsPaiement),
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  }

  return <ClientForm client={serialised} />
}
