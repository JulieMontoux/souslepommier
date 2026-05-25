import { useQuery } from '@tanstack/react-query'
import { useParams, Navigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { ClientForm } from '@/components/clients/client-form'
import type { ClientComplet } from '@/types/client'

export default function ClientEditPage() {
  const { id } = useParams<{ id: string }>()

  const { data: client, isLoading } = useQuery<ClientComplet>({
    queryKey: ['clients', id],
    queryFn: () =>
      api.get<ClientComplet>(`/clients/${id}`).then((c) => ({
        ...c,
        conditionsPaiement: Number(c.conditionsPaiement),
      })),
    enabled: !!id,
  })

  if (isLoading) return <div className="bg-muted h-48 animate-pulse rounded-xl" />
  if (!client) return <Navigate to="/dashboard/clients" replace />

  return <ClientForm client={client} />
}
