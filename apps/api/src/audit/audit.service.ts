import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { computeVenteHash } from '../lib/vente-hash'
import { computeClotureHash } from '../lib/cloture-hash'

const PAGE_SIZE = 50
const CSV_MAX = 10000

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: {
    userId?: string
    action?: string
    entite?: string
    from?: string
    to?: string
    page?: number
    format?: string
  }) {
    const { userId, action, entite, from, to, page = 1, format } = filters
    const isCsv = format === 'csv'

    const where = {
      ...(userId && { userId }),
      ...(action && { action }),
      ...(entite && { entite }),
      ...(from || to
        ? {
            timestamp: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    }

    if (isCsv) {
      const items = await this.prisma.journalAudit.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: CSV_MAX,
      })
      return { data: items, meta: { total: items.length, format: 'csv' } }
    }

    const skip = (page - 1) * PAGE_SIZE
    const [total, items] = await Promise.all([
      this.prisma.journalAudit.count({ where }),
      this.prisma.journalAudit.findMany({
        where,
        skip,
        take: PAGE_SIZE,
        orderBy: { timestamp: 'desc' },
      }),
    ])

    return {
      data: items,
      meta: { total, page, limit: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) },
    }
  }

  async verify(): Promise<{
    valid: boolean
    nbVentesVerifiees: number
    nbCloturesVerifiees: number
    erreurs: string[]
  }> {
    const erreurs: string[] = []

    const ventes = await this.prisma.vente.findMany({
      where: { statut: 'FINALISEE' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        numeroTicket: true,
        date: true,
        totalTTC: true,
        vendeurId: true,
        hash: true,
        hashPrecedent: true,
      },
    })

    let prevVenteHash: string | null = null
    for (const v of ventes) {
      const expected = computeVenteHash({
        numero: v.numeroTicket,
        date: v.date.toISOString(),
        totalTTC: String(Number(v.totalTTC)),
        vendeurId: v.vendeurId,
        hashPrecedent: prevVenteHash,
      })
      if (expected !== v.hash) {
        erreurs.push(`Vente ${v.numeroTicket} (${v.id}): hash invalide`)
      }
      prevVenteHash = v.hash
    }

    const clotures = await this.prisma.clotureCaisse.findMany({
      orderBy: { numeroCloture: 'asc' },
      select: {
        id: true,
        numeroCloture: true,
        date: true,
        totalTTC: true,
        gerantId: true,
        hashCumulatif: true,
      },
    })

    let prevClotureHash: string | null = null
    for (const c of clotures) {
      const expected = computeClotureHash({
        numero: c.numeroCloture,
        date: c.date.toISOString(),
        totalTTC: Number(c.totalTTC).toFixed(4),
        gerantId: c.gerantId,
        hashPrecedent: prevClotureHash,
      })
      if (expected !== c.hashCumulatif) {
        erreurs.push(`Clôture n°${c.numeroCloture} (${c.id}): hash invalide`)
      }
      prevClotureHash = c.hashCumulatif
    }

    return {
      valid: erreurs.length === 0,
      nbVentesVerifiees: ventes.length,
      nbCloturesVerifiees: clotures.length,
      erreurs,
    }
  }
}
