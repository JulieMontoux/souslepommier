import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeDayStats } from '@/lib/compute-stats'
import { DashboardStats } from '@/components/stats/dashboard-stats'

export const metadata = { title: 'Tableau de bord — Sous le Pommier' }

export default async function DashboardPage() {
  const [session, stats] = await Promise.all([auth(), computeDayStats(prisma, new Date())])

  const user = session?.user as { prenom?: string }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Bonjour, {user?.prenom ?? 'Gérant'} 👋</h1>
      </div>
      <DashboardStats initialStats={stats} />
    </div>
  )
}
