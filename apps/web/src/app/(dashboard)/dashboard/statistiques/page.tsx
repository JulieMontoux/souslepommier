import { prisma } from '@/lib/prisma'
import { computeYearStats } from '@/lib/compute-stats'
import dynamic from 'next/dynamic'
import { Toaster } from '@/components/ui/sonner'

const AnnuelStats = dynamic(
  () => import('@/components/stats/annuel-stats').then((m) => m.AnnuelStats),
  { ssr: false, loading: () => <div className="bg-muted h-96 animate-pulse rounded-xl" /> }
)

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
