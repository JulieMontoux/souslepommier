import { prisma } from '@/lib/prisma'
import { ProduitsList } from '@/components/produits/produits-list'
import type { ProduitComplet } from '@/types/produits'

export const metadata = { title: 'Produits — Sous le Pommier' }

export default async function ProduitsPage() {
  const [produits, categories] = await Promise.all([
    prisma.produit.findMany({
      include: { categorie: true, variantes: { orderBy: { poids: 'asc' } } },
      orderBy: { nom: 'asc' },
    }),
    prisma.categorie.findMany({ orderBy: { nom: 'asc' } }),
  ])

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
