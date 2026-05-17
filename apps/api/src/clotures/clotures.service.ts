import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { createHmac } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class CloturesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.clotureCaisse.findMany({
      orderBy: { numeroCloture: 'desc' },
      include: {
        gerant: { select: { id: true, nom: true, prenom: true } },
      },
    })
  }

  async findOne(id: string) {
    const cloture = await this.prisma.clotureCaisse.findUnique({
      where: { id },
      include: {
        gerant: { select: { id: true, nom: true, prenom: true } },
      },
    })

    if (!cloture) throw new NotFoundException('Clôture introuvable')
    return cloture
  }

  async getApercu() {
    const { start, end } = this.todayRange()
    const ventes = await this.prisma.vente.findMany({
      where: { statut: 'FINALISEE', date: { gte: start, lte: end } },
      include: {
        lignes: true,
        paiements: true,
        vendeur: { select: { id: true, nom: true, prenom: true } },
      },
    })

    return this.computeTotals(ventes)
  }

  async create(gerantId: string) {
    const { start, end } = this.todayRange()

    const existing = await this.prisma.clotureCaisse.findFirst({
      where: { date: { gte: start, lte: end } },
    })
    if (existing) throw new ConflictException('Une clôture a déjà été effectuée aujourd\'hui')

    const ventes = await this.prisma.vente.findMany({
      where: { statut: 'FINALISEE', date: { gte: start, lte: end } },
      include: {
        lignes: true,
        paiements: true,
        vendeur: { select: { id: true, nom: true, prenom: true } },
      },
    })

    const totals = this.computeTotals(ventes)

    const lastCloture = await this.prisma.clotureCaisse.findFirst({
      orderBy: { numeroCloture: 'desc' },
      select: { numeroCloture: true, hashCumulatif: true },
    })

    const numeroCloture = (lastCloture?.numeroCloture ?? 0) + 1
    const hashPrecedent = lastCloture?.hashCumulatif ?? null

    const annulees = await this.prisma.vente.findMany({
      where: { statut: 'ANNULEE', date: { gte: start, lte: end } },
      select: { id: true, numeroTicket: true, totalTTC: true, motifAnnulation: true },
    })

    const now = new Date()
    const hashCumulatif = createHmac('sha256', process.env.SIGNING_SECRET!)
      .update(
        JSON.stringify({
          numero: numeroCloture,
          date: now.toISOString(),
          totalTTC: Number(totals.totalTTC).toFixed(4),
          gerantId,
          hashPrecedent,
        }),
      )
      .digest('hex')

    return this.prisma.clotureCaisse.create({
      data: {
        numeroCloture,
        date: now,
        gerantId,
        nbVentes: totals.nbVentes,
        totalEspeces: totals.totalEspeces,
        totalCB: totals.totalCB,
        totalCheque: totals.totalCheque,
        totalVirement: totals.totalVirement,
        totalTR: totals.totalTR,
        totalVentes: totals.totalVentes,
        totalHT: totals.totalHT,
        totalTVA: totals.totalTVA,
        totalTTC: totals.totalTTC,
        recapVendeurs: totals.parVendeur,
        recapTVA: totals.parTVA,
        recapProduits: totals.parProduit,
        ventesAnnulees: annulees,
        hashCumulatif,
      },
      include: {
        gerant: { select: { id: true, nom: true, prenom: true } },
      },
    })
  }

  private todayRange() {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  private computeTotals(ventes: any[]) {
    let totalEspeces = 0
    let totalCB = 0
    let totalCheque = 0
    let totalVirement = 0
    let totalTR = 0
    let totalHT = 0
    let totalTVA = 0
    let totalTTC = 0

    const vendeurMap = new Map<string, { nom: string; prenom: string; totalTTC: number; nbVentes: number }>()
    const tvaMap = new Map<number, { tauxTVA: number; totalHT: number; totalTVA: number }>()
    const produitMap = new Map<string, { designation: string; qte: number; caHT: number }>()

    for (const vente of ventes) {
      totalHT += Number(vente.totalHT)
      totalTVA += Number(vente.totalTVA)
      totalTTC += Number(vente.totalTTC)

      for (const p of vente.paiements) {
        const montant = Number(p.montant)
        switch (p.mode) {
          case 'ESPECES': totalEspeces += montant; break
          case 'CB': totalCB += montant; break
          case 'CHEQUE': totalCheque += montant; break
          case 'VIREMENT': totalVirement += montant; break
          case 'TICKET_RESTO': totalTR += montant; break
        }
      }

      const vid = vente.vendeur.id
      const existing = vendeurMap.get(vid) ?? { nom: vente.vendeur.nom, prenom: vente.vendeur.prenom, totalTTC: 0, nbVentes: 0 }
      existing.totalTTC += Number(vente.totalTTC)
      existing.nbVentes += 1
      vendeurMap.set(vid, existing)

      for (const ligne of vente.lignes) {
        const taux = Number(ligne.tauxTVA)
        const tvaEntry = tvaMap.get(taux) ?? { tauxTVA: taux, totalHT: 0, totalTVA: 0 }
        tvaEntry.totalHT += Number(ligne.montantHT)
        tvaEntry.totalTVA += Number(ligne.montantTVA)
        tvaMap.set(taux, tvaEntry)

        const key = ligne.varianteProduitId ?? ligne.designation ?? 'inconnu'
        const prodEntry = produitMap.get(key) ?? { designation: String(ligne.designation ?? key), qte: 0, caHT: 0 }
        prodEntry.qte += Number(ligne.qte)
        prodEntry.caHT += Number(ligne.montantHT)
        produitMap.set(key, prodEntry)
      }
    }

    return {
      nbVentes: ventes.length,
      totalEspeces,
      totalCB,
      totalCheque,
      totalVirement,
      totalTR,
      totalVentes: totalTTC,
      totalHT,
      totalTVA,
      totalTTC,
      parVendeur: Object.fromEntries(vendeurMap),
      parTVA: Object.fromEntries(tvaMap),
      parProduit: Object.fromEntries(produitMap),
    }
  }
}
