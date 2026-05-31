export type UserSummary = {
  id: string
  email: string
  prenom: string
  nom: string
  role: 'VENDEUR' | 'GERANT'
  actif: boolean
  lastLoginAt: string | null
  createdAt: string
  nbVentesMois: number
}

export type UserDetail = UserSummary & {
  caMoisHT: number
  caMoisTTC: number
  caWeekHT: number
  caWeekTTC: number
  nbVentesTotal: number
}
