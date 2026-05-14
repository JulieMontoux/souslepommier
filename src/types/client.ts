export type ClientComplet = {
  id: string
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
  notes: string | null
  actif: boolean
  createdAt: string
  updatedAt: string
}
