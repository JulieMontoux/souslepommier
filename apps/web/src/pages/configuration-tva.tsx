import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { TvaConfig } from '@/components/config/tva-config'
import type { TauxTVA } from '@/types/taux-tva'

export default function ConfigurationTvaPage() {
  const { data: rows = [], isLoading } = useQuery<TauxTVA[]>({
    queryKey: ['taux-tva'],
    queryFn: () => api.get('/taux-tva'),
  })

  if (isLoading) return <div className="bg-muted h-48 animate-pulse rounded-xl" />

  return <TvaConfig initial={rows} />
}
