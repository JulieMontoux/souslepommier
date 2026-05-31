import type { Produit, VarianteProduit, Categorie } from '@souslepommier/database'

export type VarianteAvecDecimal = Omit<VarianteProduit, 'poids' | 'prixHT'> & {
  poids: number | null
  prixHT: number
  tauxTVA: { id: string; libelle: string; taux: number }
  prixTTC: number
}

export type ProduitComplet = Produit & {
  categorie: Categorie | null
  variantes: VarianteAvecDecimal[]
  _count?: { variantes: number }
}

