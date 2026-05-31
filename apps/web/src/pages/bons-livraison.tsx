import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { BonLivraisonList } from '@/components/bons-livraison/bon-livraison-list'
import type { BLSummary } from '@/types/bon-livraison'

export default function BonsLivraisonPage() {
  const { data: bls = [] } = useQuery<BLSummary[]>({
    queryKey: ['bons-livraison'],
    queryFn: () => api.get('/bons-livraison'),
  })
  return <BonLivraisonList bls={bls} />
}
