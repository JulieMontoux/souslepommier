import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ClotureList } from '@/components/clotures/cloture-list'
import type { ClotureSummary } from '@/types/cloture'

export default function CloturesPage() {
  const { data: clotures = [] } = useQuery<ClotureSummary[]>({
    queryKey: ['clotures'],
    queryFn: () => api.get('/clotures'),
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dejaCloturee = clotures.some((c) => new Date(c.date) >= today)

  return <ClotureList clotures={clotures} dejaClotureeAujourdhui={dejaCloturee} />
}
