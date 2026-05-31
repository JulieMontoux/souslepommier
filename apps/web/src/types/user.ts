export type UserSummary = {
  id: string
  username: string
  email: string | null
  prenom: string
  nom: string
  role: 'SUPERADMIN' | 'GERANT' | 'VENDEUR'
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
