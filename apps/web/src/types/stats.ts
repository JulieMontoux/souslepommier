export type HeureStat = {
  heure: number
  nbVentes: number
  caTTC: number
}

export type TopProduit = {
  produitId: string
  nom: string
  qte: number
  caHT: number
  caTTC: number
}

export type ModePaiementStat = {
  mode: string
  montant: number
  nbVentes: number
}

export type VendeurStat = {
  vendeurId: string
  prenom: string
  nom: string
  nbVentes: number
  caHT: number
  caTTC: number
}

export type DayStats = {
  date: string
  caHT: number
  caTTC: number
  nbVentes: number
  panierMoyen: number
  nbVentesAnnulees: number
  j1CaTTC: number
  j1NbVentes: number
  j1PanierMoyen: number
  parHeure: HeureStat[]
  topProduits: TopProduit[]
  parModePaiement: ModePaiementStat[]
  parVendeur: VendeurStat[]
}

export type JourPeriode = {
  date: string
  caHT: number
  caTTC: number
  nbVentes: number
}

export type PeriodStats = {
  from: string
  to: string
  caHT: number
  caTTC: number
  nbVentes: number
  panierMoyen: number
  parJour: JourPeriode[]
  n1: {
    caHT: number
    caTTC: number
    nbVentes: number
    panierMoyen: number
    deltaCA: number | null
    deltaNbVentes: number | null
  }
}

export type MoisStat = {
  mois: number
  caHT: number
  caTTC: number
  nbVentes: number
}

export type TVAStat = {
  taux: number
  montantHT: number
  montantTVA: number
  montantTTC: number
}

export type JourStat = {
  date: string
  nbVentes: number
  caTTC: number
}

export type TopProduitAnnuel = TopProduit & { pctCA: number }

export type YearStats = {
  year: number
  caHT: number
  caTTC: number
  nbVentes: number
  panierMoyen: number
  parMois: MoisStat[]
  topProduits: TopProduitAnnuel[]
  parTVA: TVAStat[]
  parJour: JourStat[]
}
