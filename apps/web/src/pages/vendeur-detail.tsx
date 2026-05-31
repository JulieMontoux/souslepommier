import { useQuery } from '@tanstack/react-query'
import { useParams, Navigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { VendeurDetailView } from '@/components/users/vendeur-detail'
import { useAuth } from '@/contexts/auth'
import type { UserDetail } from '@/types/user'

export default function VendeurDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { state } = useAuth()
  const currentUserId = state.status === 'authenticated' ? state.user.id : null

  const { data: user, isLoading } = useQuery<UserDetail>({
    queryKey: ['users', id],
    queryFn: () => api.get(`/users/${id}`),
    enabled: !!id,
  })

  if (isLoading) return <div className="bg-muted h-48 animate-pulse rounded-xl" />
  if (!user) return <Navigate to="/dashboard/vendeurs" replace />

  return <VendeurDetailView user={user} isSelf={currentUserId === id} />
}
