export type RecapVendeur = {
  vendeurId: string
  prenom: string
  nom: string
  nbVentes: number
  totalHT: number
  totalTTC: number
}

export type RecapTVALine = {
  taux: number
  baseHT: number
  montantTVA: number
}

export type RecapProduit = {
  produitId: string
  nom: string
  qteTotal: number
  montantHT: number
}

export type VenteAnnuleeInfo = {
  numero: string
  totalTTC: number
  motif: string | null
  vendeurPrenom: string
}

export type ClotureApercu = {
  date: string
  nbVentes: number
  totalEspeces: number
  totalCB: number
  totalCheque: number
  totalVirement: number
  totalTR: number
  totalHT: number
  totalTVA: number
  totalTTC: number
  recapVendeurs: RecapVendeur[]
  recapTVA: RecapTVALine[]
  recapProduits: RecapProduit[]
  ventesAnnulees: VenteAnnuleeInfo[]
}

export type ClotureDetail = ClotureApercu & {
  id: string
  numeroCloture: number
  gerantId: string
  gerantPrenom: string
  gerantNom: string
  hashCumulatif: string
  createdAt: string
}

export type ClotureSummary = {
  id: string
  numeroCloture: number
  date: string
  nbVentes: number
  totalTTC: number
}
