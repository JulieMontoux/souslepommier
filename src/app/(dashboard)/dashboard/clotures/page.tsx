import { prisma } from '@/lib/prisma'
import { ClotureList } from '@/components/clotures/cloture-list'
import type { ClotureSummary } from '@/types/cloture'

export const metadata = { title: 'Clôtures de caisse — Sous le Pommier' }

export default async function CloturesPage() {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  const [clotures, todayCloture] = await Promise.all([
    prisma.clotureCaisse.findMany({
      orderBy: { numeroCloture: 'desc' },
      select: { id: true, numeroCloture: true, date: true, nbVentes: true, totalTTC: true },
    }),
    prisma.clotureCaisse.findFirst({
      where: { date: { gte: start, lte: end } },
      select: { id: true },
    }),
  ])

  const serialised: ClotureSummary[] = clotures.map((c) => ({
    id: c.id,
    numeroCloture: c.numeroCloture,
    date: c.date.toISOString(),
    nbVentes: c.nbVentes,
    totalTTC: Number(c.totalTTC),
  }))

  return <ClotureList clotures={serialised} dejaClotureeAujourdhui={!!todayCloture} />
}
