import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { VendeurList } from '@/components/users/vendeur-list'
import type { UserSummary } from '@/types/user'

export default function VendeursPage() {
  const { data: users = [] } = useQuery<UserSummary[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
  })
  return <VendeurList users={users} />
}
