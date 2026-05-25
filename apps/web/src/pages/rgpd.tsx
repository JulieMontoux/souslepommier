import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { DemandesAdmin } from '@/components/rgpd/demandes-admin'
import type { DemandeRGPD } from '@/types/rgpd'

type UserSummary = { id: string; nom: string; prenom: string; email: string }

export default function RgpdPage() {
  const { data: demandes = [], isLoading: l1 } = useQuery<DemandeRGPD[]>({
    queryKey: ['rgpd', 'demandes'],
    queryFn: () => api.get('/rgpd/demandes'),
  })

  const { data: users = [], isLoading: l2 } = useQuery<UserSummary[]>({
    queryKey: ['users', 'actif'],
    queryFn: () => api.get('/users?actif=true&select=id,nom,prenom,email'),
  })

  if (l1 || l2) return <div className="bg-muted h-48 animate-pulse rounded-xl" />

  return <DemandesAdmin initial={demandes} users={users} />
}
