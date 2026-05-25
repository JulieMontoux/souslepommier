import { connection } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeDayStats } from '@/lib/compute-stats'
import dynamic from 'next/dynamic'

const DashboardStats = dynamic(
  () => import('@/components/stats/dashboard-stats').then((m) => m.DashboardStats),
  { ssr: false, loading: () => <div className="bg-muted h-96 animate-pulse rounded-xl" /> }
)

export const metadata = { title: 'Tableau de bord — Sous le Pommier' }

export default async function DashboardPage() {
  await connection()
  const [session, stats] = await Promise.all([auth(), computeDayStats(prisma, new Date())])

  const user = session?.user as { prenom?: string }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Bonjour, {user?.prenom ?? 'Gérant'}</h1>
      </div>
      <DashboardStats initialStats={stats} />
    </div>
  )
}
