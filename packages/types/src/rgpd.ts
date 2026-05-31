export type TypeDroitRGPD = 'ACCES' | 'RECTIFICATION' | 'EFFACEMENT' | 'PORTABILITE' | 'OPPOSITION'
export type StatutDemandeRGPD = 'EN_ATTENTE' | 'EN_COURS' | 'TRAITEE' | 'REFUSEE'

export type DemandeRGPD = {
  id: string
  type: TypeDroitRGPD
  statut: StatutDemandeRGPD
  nom: string
  email: string
  message: string | null
  reponse: string | null
  traitePar: string | null
  traiteAt: string | null
  createdAt: string
  updatedAt: string
}

export const TYPE_LABELS: Record<TypeDroitRGPD, string> = {
  ACCES: "Droit d'accès",
  RECTIFICATION: 'Droit de rectification',
  EFFACEMENT: "Droit à l'effacement",
  PORTABILITE: 'Droit à la portabilité',
  OPPOSITION: "Droit d'opposition",
}

export const STATUT_LABELS: Record<StatutDemandeRGPD, string> = {
  EN_ATTENTE: 'En attente',
  EN_COURS: 'En cours',
  TRAITEE: 'Traitée',
  REFUSEE: 'Refusée',
}
