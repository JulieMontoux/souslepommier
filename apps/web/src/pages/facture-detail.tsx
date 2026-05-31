import { useQuery } from '@tanstack/react-query'
import { useParams, Navigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { FactureDetailView } from '@/components/factures/facture-detail'
import type { FactureDetail } from '@/types/facture'

export default function FactureDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: facture, isLoading } = useQuery<FactureDetail & { avoir?: { id: string } | null }>({
    queryKey: ['factures', id],
    queryFn: () => api.get(`/factures/${id}`),
    enabled: !!id,
  })

  if (isLoading) return <div className="bg-muted h-48 animate-pulse rounded-xl" />
  if (!facture) return <Navigate to="/dashboard/factures" replace />

  return <FactureDetailView facture={facture} avoirId={facture.avoir?.id ?? undefined} />
}
