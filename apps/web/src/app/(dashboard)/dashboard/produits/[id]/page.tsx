import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCategories } from '@/lib/cached-data'
import { ProduitForm } from '@/components/produits/produit-form'
import type { ProduitComplet } from '@/types/produits'

export const metadata = { title: 'Modifier le produit — Sous le Pommier' }

export default async function EditProduitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [produit, categories] = await Promise.all([
    prisma.produit.findUnique({
      where: { id },
      include: { categorie: true, variantes: { orderBy: { poids: 'asc' } } },
    }),
    getCategories(),
  ])

  if (!produit) notFound()

  // Convertir Decimal → number pour le client
  const produitSerialise: ProduitComplet = {
    ...produit,
    variantes: produit.variantes.map((v) => ({
      ...v,
      poids: v.poids ? Number(v.poids) : null,
      prixHT: Number(v.prixHT),
      tauxTVA: Number(v.tauxTVA),
      prixTTC: Number(v.prixTTC),
    })),
  }

  return <ProduitForm produit={produitSerialise} categories={categories} />
}
