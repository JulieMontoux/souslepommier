import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ProduitForm } from '@/components/produits/produit-form'

export default function ProduitNewPage() {
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ id: string; nom: string }[]>('/categories'),
  })
  return <ProduitForm categories={categories} />
}
