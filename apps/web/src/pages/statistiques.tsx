import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { AnnuelStats } from '@/components/stats/annuel-stats'
import type { YearStats } from '@/types/stats'

export default function StatistiquesPage() {
  const currentYear = new Date().getFullYear()

  const { data: stats, isLoading: l1 } = useQuery<YearStats>({
    queryKey: ['stats', 'year', currentYear],
    queryFn: () => api.get(`/stats/year/${currentYear}`),
  })

  const { data: prevStats, isLoading: l2 } = useQuery<YearStats>({
    queryKey: ['stats', 'year', currentYear - 1],
    queryFn: () => api.get(`/stats/year/${currentYear - 1}`),
  })

  if (l1 || l2 || !stats || !prevStats) {
    return <div className="bg-muted h-96 animate-pulse rounded-xl" />
  }

  return <AnnuelStats initial={stats} initialPrev={prevStats} currentYear={currentYear} />
}
