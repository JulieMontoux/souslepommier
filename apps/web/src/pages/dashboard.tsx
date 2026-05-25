import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/auth'
import { DashboardStats } from '@/components/stats/dashboard-stats'
import type { DayStats } from '@/types/stats'

export default function DashboardPage() {
  const { state } = useAuth()
  const user = state.status === 'authenticated' ? state.user : null

  const { data: stats } = useQuery<DayStats>({
    queryKey: ['stats', 'today'],
    queryFn: () => api.get('/stats/today'),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Bonjour, {user?.prenom ?? 'Gérant'}</h1>
      </div>
      {stats && <DashboardStats initialStats={stats} />}
    </div>
  )
}
