export type ConfigTicket = {
  raisonSociale: string
  siret: string | null
  tvaIntracommunautaire: string | null
  adresse: string | null
  codePostal: string | null
  ville: string | null
  telephone: string | null
} | null

export type TicketLigne = {
  designation: string
  qte: number
  prixUnitaireHT: number
  tauxTVA: number
  montantTTC: number
  remise: number
}

export type TicketPaiement = {
  mode: string
  montant: number
  renduMonnaie: number
  reference: string | null
}

export type RecapTaxe = {
  taux: number
  baseHT: number
  montantTVA: number
}

export type TicketVente = {
  id: string
  numeroTicket: string
  date: string // ISO string
  vendeurPrenom: string
  lignes: TicketLigne[]
  paiements: TicketPaiement[]
  recapTaxes: RecapTaxe[]
  totalHT: number
  totalTVA: number
  totalTTC: number
}
