export type PalierRemise = {
  id: string
  qteMin: number
  remisePct: number
}

export type ProduitPOSVariante = {
  id: string
  poids: number | null
  emballage: string
  prixHT: number
  tauxTVA: number
  prixTTC: number
  sku: string | null
  venteAuPoids: boolean
  stockActuel: number
  stockMin: number | null
  paliers: PalierRemise[]
}

export type ProduitPOS = {
  id: string
  nom: string
  description: string | null
  image: string | null
  horsJour: boolean
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
  remise?: number
  venteAuPoids?: boolean
}
