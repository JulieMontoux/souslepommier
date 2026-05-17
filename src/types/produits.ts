import type { Produit, VarianteProduit, Categorie } from '@/generated/prisma/client'

export type VarianteAvecDecimal = Omit<
  VarianteProduit,
  'poids' | 'prixHT' | 'tauxTVA' | 'prixTTC'
> & {
  poids: number | null
  prixHT: number
  tauxTVA: number
  prixTTC: number
}

export type ProduitComplet = Produit & {
  categorie: Categorie | null
  variantes: VarianteAvecDecimal[]
  _count?: { variantes: number }
}

// Formulaire variante (react-hook-form)
export type VarianteFormRow = {
  id?: string // undefined = nouvelle variante (pas encore en BDD)
  poids: string // string car input text
  emballage: string
  prixHT: string
  tauxTVA: string
  prixTTC: string // calculé live, lecture seule
  sku: string
  actif: boolean
}
