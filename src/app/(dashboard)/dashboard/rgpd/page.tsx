import { prisma } from '@/lib/prisma'
import { DemandesAdmin } from '@/components/rgpd/demandes-admin'
import { Toaster } from '@/components/ui/sonner'
import type { DemandeRGPD } from '@/types/rgpd'

export const metadata = { title: 'RGPD — Sous le Pommier' }

export default async function RgpdDashboardPage() {
  const [demandesRaw, usersRaw] = await Promise.all([
    prisma.demandeRGPD.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.user.findMany({
      where: { actif: true },
      select: { id: true, nom: true, prenom: true, email: true },
      orderBy: { nom: 'asc' },
    }),
  ])

  const demandes: DemandeRGPD[] = demandesRaw.map((d) => ({
    ...d,
    traiteAt: d.traiteAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }))

  return (
    <>
      <DemandesAdmin initial={demandes} users={usersRaw} />
      <Toaster richColors position="bottom-right" />
    </>
  )
}
