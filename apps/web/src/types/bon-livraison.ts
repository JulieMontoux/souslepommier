export type StatutBL = 'BROUILLON' | 'EMIS' | 'LIVRE' | 'ANNULE'

export type LigneBLType = {
  id: string
  designation: string
  qte: number
  unite: string | null
  prixUnitaireHT: number
  remise: number
  montantHT: number
}

export type BLClientInfo = {
  raisonSociale: string
  siret: string | null
  tvaIntracommunautaire: string | null
  adresse: string | null
  codePostal: string | null
  ville: string | null
  pays: string
  email: string | null
  telephone: string | null
}

export type BLDetail = {
  id: string
  numero: string
  clientId: string
  venteId: string | null
  dateEmission: string
  dateLivraison: string | null
  statut: StatutBL
  totalHT: number
  remiseCommerciale: number | null
  notes: string | null
  client: BLClientInfo
  lignes: LigneBLType[]
}

export type BLSummary = {
  id: string
  numero: string
  clientId: string
  dateEmission: string
  dateLivraison: string | null
  statut: StatutBL
  totalHT: number
  remiseCommerciale: number | null
  clientNom: string
}
