export type LigneFactureType = {
  id: string
  designation: string
  qte: number
  prixUnitaireHT: number
  tauxTVA: number
  montantHT: number
  montantTVA: number
  montantTTC: number
  remise: number
}

export type FactureClientInfo = {
  raisonSociale: string
  siret: string | null
  tvaIntracommunautaire: string | null
  adresse: string | null
  codePostal: string | null
  ville: string | null
  pays: string
  email: string | null
  telephone: string | null
  conditionsPaiement: number
}

export type FactureDetail = {
  id: string
  numero: string
  clientId: string
  venteId: string | null
  dateEmission: string
  dateEcheance: string | null
  datePaiement: string | null
  dateLivraison: string | null
  statut: 'BROUILLON' | 'EMISE' | 'PAYEE' | 'ANNULEE'
  totalHT: number
  totalTVA: number
  totalTTC: number
  notes: string | null
  factureOriginaleId: string | null
  client: FactureClientInfo
  lignes: LigneFactureType[]
}

export type FactureSummary = {
  id: string
  numero: string
  dateEmission: string
  dateEcheance: string | null
  statut: 'BROUILLON' | 'EMISE' | 'PAYEE' | 'ANNULEE'
  totalTTC: number
  factureOriginaleId: string | null
  client: { raisonSociale: string }
}
