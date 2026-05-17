export type ProduitPOSVariante = {
  id: string
  poids: number | null
  emballage: string
  prixHT: number
  tauxTVA: number
  prixTTC: number
}

export type ProduitPOS = {
  id: string
  nom: string
  description: string | null
  categorieNom: string | null
  variantes: ProduitPOSVariante[]
}

export type LigneCart = {
  key: string
  varianteProduitId: string
  produitNom: string
  varianteLabel: string
  qte: number
  prixUnitaireHT: number
  tauxTVA: number
}
