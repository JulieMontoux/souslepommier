import { prisma } from '@/lib/prisma'
import { ProduitForm } from '@/components/produits/produit-form'

export const metadata = { title: 'Nouveau produit — Sous le Pommier' }

export default async function NouveauProduitPage() {
  const categories = await prisma.categorie.findMany({ orderBy: { nom: 'asc' } })
  return <ProduitForm categories={categories} />
}
