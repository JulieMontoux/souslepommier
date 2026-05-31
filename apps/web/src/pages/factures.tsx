import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { FactureList } from '@/components/factures/facture-list'
import type { FactureSummary } from '@/types/facture'

export default function FacturesPage() {
  const { data: factures = [] } = useQuery<FactureSummary[]>({
    queryKey: ['factures'],
    queryFn: () => api.get('/factures'),
  })
  return <FactureList factures={factures} />
}
