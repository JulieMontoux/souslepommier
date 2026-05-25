import { getDashboardProduits, getCategories } from '@/lib/cached-data'
import { ProduitsList } from '@/components/produits/produits-list'
import type { ProduitComplet } from '@/types/produits'

export const metadata = { title: 'Produits — Sous le Pommier' }

export default async function ProduitsPage() {
  const [produits, categories] = await Promise.all([getDashboardProduits(), getCategories()])

  // Convertir Decimal → number pour le client
  const produitsSerialises: ProduitComplet[] = produits.map((p) => ({
    ...p,
    variantes: p.variantes.map((v) => ({
      ...v,
      poids: v.poids ? Number(v.poids) : null,
      prixHT: Number(v.prixHT),
      tauxTVA: Number(v.tauxTVA),
      prixTTC: Number(v.prixTTC),
    })),
  }))

  return <ProduitsList produits={produitsSerialises} categories={categories} />
}
