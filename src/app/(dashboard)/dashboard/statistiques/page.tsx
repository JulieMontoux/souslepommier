import { prisma } from '@/lib/prisma'
import { computeYearStats } from '@/lib/compute-stats'
import { AnnuelStats } from '@/components/stats/annuel-stats'
import { Toaster } from '@/components/ui/sonner'

export const metadata = { title: 'Statistiques — Sous le Pommier' }

export default async function StatistiquesPage() {
  const currentYear = new Date().getFullYear()

  const [stats, prevStats] = await Promise.all([
    computeYearStats(prisma, currentYear),
    computeYearStats(prisma, currentYear - 1),
  ])

  return (
    <>
      <AnnuelStats initial={stats} initialPrev={prevStats} currentYear={currentYear} />
      <Toaster richColors position="bottom-right" />
    </>
  )
}
