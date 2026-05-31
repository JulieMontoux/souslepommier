import { useQuery } from '@tanstack/react-query'
import { useParams, Navigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { BonLivraisonDetailView } from '@/components/bons-livraison/bon-livraison-detail'
import type { BLDetail } from '@/types/bon-livraison'

export default function BonLivraisonDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: bl, isLoading } = useQuery<BLDetail>({
    queryKey: ['bons-livraison', id],
    queryFn: () => api.get(`/bons-livraison/${id}`),
    enabled: !!id,
  })

  if (isLoading) return <div className="bg-muted h-48 animate-pulse rounded-xl" />
  if (!bl) return <Navigate to="/dashboard/bons-livraison" replace />

  return <BonLivraisonDetailView bl={bl} />
}
