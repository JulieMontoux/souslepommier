import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Lock, AlertTriangle } from 'lucide-react'
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

  const { data: clotureStatut } = useQuery({
    queryKey: ['caisse-statut'],
    queryFn: async () => {
      const res = await fetch('/api/clotures/apercu')
      if (res.status === 409) return { isCloturee: true }
      return { isCloturee: false }
    },
    staleTime: 30_000,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Bonjour, {user?.prenom ?? 'Gérant'}</h1>
      </div>

      {clotureStatut?.isCloturee && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <Lock className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-700">
            La caisse est <strong>clôturée</strong> pour aujourd&apos;hui.{' '}
            <Link to="/dashboard/clotures" className="font-medium underline underline-offset-2">
              Voir les clôtures
            </Link>
          </p>
        </div>
      )}

      {stats && stats.nbVentesAnnulees > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/40">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-300">
            <strong>{stats.nbVentesAnnulees}</strong> vente
            {stats.nbVentesAnnulees > 1 ? 's annulées' : ' annulée'} aujourd&apos;hui.{' '}
            <Link
              to={`/dashboard/ventes?statut=ANNULEE&from=${new Date().toLocaleDateString('fr-CA')}&to=${new Date().toLocaleDateString('fr-CA')}`}
              className="font-medium underline underline-offset-2"
            >
              Voir le détail
            </Link>
          </p>
        </div>
      )}

      {stats && <DashboardStats initialStats={stats} />}
    </div>
  )
}
