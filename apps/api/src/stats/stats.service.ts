import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { roundFiscal } from './tva.utils'

type VenteWithDetails = {
  id: string
  date: Date
  totalHT: any
  totalTTC: any
  totalTVA: any
  lignes: Array<{
    varianteProduitId: string | null
    designation?: string | null
    qte: any
    prixUnitaireHT: any
    tauxTVA: any
    montantHT: any
    montantTVA: any
    montantTTC: any
    variante?: {
      sku: string | null
      produit: { id: string; nom: string }
    } | null
  }>
  paiements: Array<{ mode: string; montant: any }>
  vendeur: { id: string; nom: string; prenom: string }
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDayStats(date: Date) {
    const { start, end } = this.dayRange(date)
    const prevDate = new Date(date)
    prevDate.setDate(prevDate.getDate() - 1)
    const { start: prevStart, end: prevEnd } = this.dayRange(prevDate)

    const [ventes, ventesJ1] = await Promise.all([
      this.fetchVentes(start, end),
      this.fetchVentes(prevStart, prevEnd),
    ])

    const current = this.aggregateDay(ventes)
    const previous = this.aggregateDay(ventesJ1)

    return { ...current, comparaison: previous }
  }

  async getYearStats(year: number) {
    const start = new Date(year, 0, 1)
    const end = new Date(year + 1, 0, 1)
    const ventes = await this.fetchVentes(start, end)

    const parMois = Array.from({ length: 12 }, (_, i) => ({
      mois: i + 1,
      caHT: 0,
      caTTC: 0,
      nbVentes: 0,
    }))

    const tvaMap = new Map<number, { tauxTVA: number; totalHT: number; totalTVA: number }>()
    const produitMap = new Map<string, { nom: string; sku: string | null; qte: number; caHT: number }>()
    const parJour = new Map<string, { caHT: number; caTTC: number; nbVentes: number }>()

    let totalTTC = 0
    let nbVentes = 0

    for (const v of ventes) {
      const mois = v.date.getMonth()
      parMois[mois].caHT = roundFiscal(parMois[mois].caHT + Number(v.totalHT))
      parMois[mois].caTTC = roundFiscal(parMois[mois].caTTC + Number(v.totalTTC))
      parMois[mois].nbVentes += 1
      totalTTC += Number(v.totalTTC)
      nbVentes += 1

      const dayKey = v.date.toISOString().slice(0, 10)
      const dayEntry = parJour.get(dayKey) ?? { caHT: 0, caTTC: 0, nbVentes: 0 }
      dayEntry.caHT = roundFiscal(dayEntry.caHT + Number(v.totalHT))
      dayEntry.caTTC = roundFiscal(dayEntry.caTTC + Number(v.totalTTC))
      dayEntry.nbVentes += 1
      parJour.set(dayKey, dayEntry)

      for (const ligne of v.lignes) {
        const taux = Number(ligne.tauxTVA)
        const tvaEntry = tvaMap.get(taux) ?? { tauxTVA: taux, totalHT: 0, totalTVA: 0 }
        tvaEntry.totalHT = roundFiscal(tvaEntry.totalHT + Number(ligne.montantHT))
        tvaEntry.totalTVA = roundFiscal(tvaEntry.totalTVA + Number(ligne.montantTVA))
        tvaMap.set(taux, tvaEntry)

        const key = ligne.variante?.produit?.id ?? ligne.varianteProduitId ?? 'inconnu'
        const nom = ligne.variante?.produit?.nom ?? String(ligne.designation ?? key)
        const sku = ligne.variante?.sku ?? null
        const prodEntry = produitMap.get(key) ?? { nom, sku, qte: 0, caHT: 0 }
        prodEntry.qte += Number(ligne.qte)
        prodEntry.caHT = roundFiscal(prodEntry.caHT + Number(ligne.montantHT))
        produitMap.set(key, prodEntry)
      }
    }

    const caHTTotal = parMois.reduce((s, m) => s + m.caHT, 0)
    const topProduits = [...produitMap.values()]
      .sort((a, b) => b.caHT - a.caHT)
      .slice(0, 10)
      .map((p) => ({ ...p, pctCA: caHTTotal > 0 ? roundFiscal((p.caHT / caHTTotal) * 100) : 0 }))

    return {
      year,
      nbVentes,
      caTTC: roundFiscal(totalTTC),
      panierMoyen: nbVentes > 0 ? roundFiscal(totalTTC / nbVentes) : 0,
      parMois,
      topProduits,
      parTVA: [...tvaMap.values()].sort((a, b) => a.tauxTVA - b.tauxTVA),
      parJour: Object.fromEntries(parJour),
    }
  }

  async getPeriodStats(from: Date, to: Date) {
    const toEnd = new Date(to)
    toEnd.setHours(23, 59, 59, 999)
    const ventes = await this.fetchVentes(from, toEnd)

    let caHT = 0
    let caTTC = 0
    const parJour = new Map<string, { caHT: number; caTTC: number; nbVentes: number }>()

    for (const v of ventes) {
      caHT += Number(v.totalHT)
      caTTC += Number(v.totalTTC)

      const dayKey = v.date.toISOString().slice(0, 10)
      const dayEntry = parJour.get(dayKey) ?? { caHT: 0, caTTC: 0, nbVentes: 0 }
      dayEntry.caHT = roundFiscal(dayEntry.caHT + Number(v.totalHT))
      dayEntry.caTTC = roundFiscal(dayEntry.caTTC + Number(v.totalTTC))
      dayEntry.nbVentes += 1
      parJour.set(dayKey, dayEntry)
    }

    const nbVentes = ventes.length
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      nbVentes,
      caHT: roundFiscal(caHT),
      caTTC: roundFiscal(caTTC),
      panierMoyen: nbVentes > 0 ? roundFiscal(caTTC / nbVentes) : 0,
      parJour: Object.fromEntries(parJour),
    }
  }

  async exportCsv(from: Date, to: Date) {
    const toEnd = new Date(to)
    toEnd.setHours(23, 59, 59, 999)
    const ventes = await this.fetchVentes(from, toEnd)

    type Row = { nom: string; sku: string; taux: number; qte: number; caHT: number; tva: number; caTTC: number }
    const map = new Map<string, Row>()

    for (const v of ventes) {
      for (const ligne of v.lignes) {
        const nom = ligne.variante?.produit?.nom ?? String(ligne.designation ?? 'inconnu')
        const sku = ligne.variante?.sku ?? ''
        const taux = Number(ligne.tauxTVA)
        const key = `${nom}__${sku}__${taux}`

        const row = map.get(key) ?? { nom, sku, taux, qte: 0, caHT: 0, tva: 0, caTTC: 0 }
        row.qte += Number(ligne.qte)
        row.caHT = roundFiscal(row.caHT + Number(ligne.montantHT))
        row.tva = roundFiscal(row.tva + Number(ligne.montantTVA))
        row.caTTC = roundFiscal(row.caTTC + Number(ligne.montantTTC))
        map.set(key, row)
      }
    }

    return [...map.values()].sort((a, b) => b.caHT - a.caHT)
  }

  private async fetchVentes(start: Date, end: Date): Promise<VenteWithDetails[]> {
    return this.prisma.vente.findMany({
      where: { statut: 'FINALISEE', date: { gte: start, lte: end } },
      include: {
        lignes: {
          include: {
            variante: {
              include: { produit: { select: { id: true, nom: true } } },
            },
          },
        },
        paiements: true,
        vendeur: { select: { id: true, nom: true, prenom: true } },
      },
    }) as Promise<VenteWithDetails[]>
  }

  private dayRange(date: Date) {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  private aggregateDay(ventes: VenteWithDetails[]) {
    let caHT = 0
    let caTTC = 0
    const parHeure = Array.from({ length: 24 }, (_, h) => ({ heure: h, caTTC: 0, nbVentes: 0 }))
    const modeMap = new Map<string, number>()
    const vendeurMap = new Map<string, { nom: string; prenom: string; caTTC: number; nbVentes: number }>()
    const produitMap = new Map<string, { nom: string; sku: string | null; qte: number; caHT: number }>()

    for (const v of ventes) {
      caHT += Number(v.totalHT)
      caTTC += Number(v.totalTTC)

      const h = v.date.getHours()
      parHeure[h].caTTC = roundFiscal(parHeure[h].caTTC + Number(v.totalTTC))
      parHeure[h].nbVentes += 1

      for (const p of v.paiements) {
        modeMap.set(p.mode, roundFiscal((modeMap.get(p.mode) ?? 0) + Number(p.montant)))
      }

      const vid = v.vendeur.id
      const vEntry = vendeurMap.get(vid) ?? { nom: v.vendeur.nom, prenom: v.vendeur.prenom, caTTC: 0, nbVentes: 0 }
      vEntry.caTTC = roundFiscal(vEntry.caTTC + Number(v.totalTTC))
      vEntry.nbVentes += 1
      vendeurMap.set(vid, vEntry)

      for (const ligne of v.lignes) {
        const key = ligne.variante?.produit?.id ?? ligne.varianteProduitId ?? 'inconnu'
        const nom = ligne.variante?.produit?.nom ?? String(ligne.designation ?? key)
        const sku = ligne.variante?.sku ?? null
        const pEntry = produitMap.get(key) ?? { nom, sku, qte: 0, caHT: 0 }
        pEntry.qte += Number(ligne.qte)
        pEntry.caHT = roundFiscal(pEntry.caHT + Number(ligne.montantHT))
        produitMap.set(key, pEntry)
      }
    }

    const nbVentes = ventes.length

    return {
      nbVentes,
      caHT: roundFiscal(caHT),
      caTTC: roundFiscal(caTTC),
      panierMoyen: nbVentes > 0 ? roundFiscal(caTTC / nbVentes) : 0,
      parHeure,
      topProduits: [...produitMap.values()].sort((a, b) => b.caHT - a.caHT).slice(0, 5),
      parModePaiement: Object.fromEntries(modeMap),
      parVendeur: Object.fromEntries(vendeurMap),
    }
  }
}
