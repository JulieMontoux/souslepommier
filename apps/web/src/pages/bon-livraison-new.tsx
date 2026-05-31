import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { BonLivraisonForm } from '@/components/bons-livraison/bon-livraison-form'
import type { ClientComplet } from '@/types/client'

export default function BonLivraisonNewPage() {
  const { data: clients = [], isLoading } = useQuery<ClientComplet[]>({
    queryKey: ['clients', 'actif'],
    queryFn: () => api.get('/clients?actif=true'),
  })

  if (isLoading) return <div className="bg-muted h-48 animate-pulse rounded-xl" />

  return <BonLivraisonForm clients={clients} />
}
