import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { FactureForm } from '@/components/factures/facture-form'
import type { ClientComplet } from '@/types/client'

export default function FactureNewPage() {
  const { data: clients = [], isLoading } = useQuery<ClientComplet[]>({
    queryKey: ['clients', 'actif'],
    queryFn: () => api.get('/clients?actif=true'),
  })

  if (isLoading) return <div className="bg-muted h-48 animate-pulse rounded-xl" />

  return <FactureForm clients={clients} />
}
