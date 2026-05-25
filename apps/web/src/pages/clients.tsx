import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ClientList } from '@/components/clients/client-list'
import type { ClientComplet } from '@/types/client'

export default function ClientsPage() {
  const { data: clients = [] } = useQuery<ClientComplet[]>({
    queryKey: ['clients'],
    queryFn: () =>
      api
        .get<ClientComplet[]>('/clients')
        .then((data) =>
          data.map((c) => ({ ...c, conditionsPaiement: Number(c.conditionsPaiement) }))
        ),
  })
  return <ClientList clients={clients} />
}
