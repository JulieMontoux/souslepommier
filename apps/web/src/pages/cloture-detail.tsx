import { useQuery } from '@tanstack/react-query'
import { useParams, Navigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { ClotureDetailView } from '@/components/clotures/cloture-detail'
import type { ClotureDetail } from '@/types/cloture'

export default function ClotureDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: cloture, isLoading } = useQuery<ClotureDetail>({
    queryKey: ['clotures', id],
    queryFn: () => api.get(`/clotures/${id}`),
    enabled: !!id,
  })

  if (isLoading) return <div className="bg-muted h-48 animate-pulse rounded-xl" />
  if (!cloture) return <Navigate to="/dashboard/clotures" replace />

  return <ClotureDetailView cloture={cloture} />
}
