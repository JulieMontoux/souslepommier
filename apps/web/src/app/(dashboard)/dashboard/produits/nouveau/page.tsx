import { getCategories } from '@/lib/cached-data'
import { ProduitForm } from '@/components/produits/produit-form'

export const metadata = { title: 'Nouveau produit — Sous le Pommier' }

export default async function NouveauProduitPage() {
  const categories = await getCategories()
  return <ProduitForm categories={categories} />
}
