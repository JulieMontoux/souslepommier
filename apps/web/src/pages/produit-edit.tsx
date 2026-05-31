import { useQuery } from '@tanstack/react-query'
import { useParams, Navigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { ProduitForm } from '@/components/produits/produit-form'
import type { ProduitComplet } from '@/types/produits'

export default function ProduitEditPage() {
  const { id } = useParams<{ id: string }>()

  const { data: produit, isLoading: produitLoading } = useQuery<ProduitComplet>({
    queryKey: ['produits', id],
    queryFn: () =>
      api.get<ProduitComplet>(`/produits/${id}`).then((p) => ({
        ...p,
        variantes: p.variantes.map((v) => ({
          ...v,
          poids: v.poids != null ? Number(v.poids) : null,
          prixHT: Number(v.prixHT),
          tauxTVA: { id: v.tauxTVA.id, libelle: v.tauxTVA.libelle, taux: Number(v.tauxTVA.taux) },
          prixTTC: Number(v.prixTTC),
        })),
      })),
    enabled: !!id,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ id: string; nom: string }[]>('/categories'),
  })

  if (produitLoading) return <div className="bg-muted h-48 animate-pulse rounded-xl" />
  if (!produit) return <Navigate to="/dashboard/produits" replace />

  return <ProduitForm produit={produit} categories={categories} />
}
