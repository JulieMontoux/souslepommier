import { prisma } from '@/lib/prisma'
import { TvaConfig } from '@/components/config/tva-config'

export const metadata = { title: 'Configuration TVA — Sous le Pommier' }

export default async function TvaPage() {
  const rows = await prisma.tauxTVA.findMany({
    orderBy: [{ actif: 'desc' }, { taux: 'asc' }],
  })

  const initial = rows.map((t) => ({
    ...t,
    taux: Number(t.taux),
    dateEffet: t.dateEffet.toISOString(),
    createdAt: t.createdAt.toISOString(),
  }))

  return <TvaConfig initial={initial} />
}
