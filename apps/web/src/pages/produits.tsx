import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ProduitsList } from '@/components/produits/produits-list'
import type { ProduitComplet } from '@/types/produits'

export default function ProduitsPage() {
  const { data: produits = [] } = useQuery<ProduitComplet[]>({
    queryKey: ['produits'],
    queryFn: () =>
      api.get('/produits').then((data: unknown) =>
        (data as ProduitComplet[]).map((p) => ({
          ...p,
          variantes: p.variantes.map((v) => ({
            ...v,
            poids: v.poids != null ? Number(v.poids) : null,
            prixHT: Number(v.prixHT),
            tauxTVA: Number(v.tauxTVA),
            prixTTC: Number(v.prixTTC),
          })),
        }))
      ),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ id: string; nom: string }[]>('/categories'),
  })

  return <ProduitsList produits={produits} categories={categories} />
}
