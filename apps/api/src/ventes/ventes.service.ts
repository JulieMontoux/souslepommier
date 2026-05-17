import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { createHmac } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateVenteDto, AnnulerVenteDto } from './ventes.controller'

@Injectable()
export class VentesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page = 1,
    limit = 50,
    vendeurId?: string,
    from?: string,
    to?: string,
    statut?: string,
  ) {
    const skip = (page - 1) * limit
    const where = {
      ...(vendeurId && { vendeurId }),
      ...(statut && { statut: statut as 'OUVERTE' | 'FINALISEE' | 'ANNULEE' }),
      ...(from || to
        ? {
            date: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    }

    const [total, items] = await Promise.all([
      this.prisma.vente.count({ where }),
      this.prisma.vente.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          vendeur: { select: { id: true, nom: true, prenom: true } },
          _count: { select: { lignes: true } },
        },
      }),
    ])

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  }

  async findOne(id: string) {
    const vente = await this.prisma.vente.findUnique({
      where: { id },
      include: {
        vendeur: { select: { id: true, nom: true, prenom: true } },
        lignes: {
          include: {
            variante: {
              include: { produit: { select: { id: true, nom: true } } },
            },
          },
        },
        paiements: true,
      },
    })

    if (!vente) throw new NotFoundException('Vente introuvable')
    return vente
  }

  async findToday(userId: string, role: 'GERANT' | 'VENDEUR') {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)

    return this.prisma.vente.findMany({
      where: {
        date: { gte: start, lte: end },
        ...(role === 'VENDEUR' && { vendeurId: userId }),
      },
      orderBy: { date: 'desc' },
      include: {
        vendeur: { select: { id: true, nom: true, prenom: true } },
        _count: { select: { lignes: true } },
      },
    })
  }

  async create(dto: CreateVenteDto) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const cloture = await this.prisma.clotureCaisse.findFirst({
      where: { date: { gte: today, lt: tomorrow } },
    })
    if (cloture) {
      throw new ConflictException('La caisse est clôturée pour aujourd\'hui')
    }

    const year = new Date().getFullYear()
    const lastVente = await this.prisma.vente.findFirst({
      where: { numeroTicket: { startsWith: `T-${year}-` } },
      orderBy: { numeroTicket: 'desc' },
    })

    let seq = 1
    if (lastVente) {
      const parts = lastVente.numeroTicket.split('-')
      const lastSeq = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(lastSeq)) seq = lastSeq + 1
    }
    const numeroTicket = `T-${year}-${String(seq).padStart(6, '0')}`

    const lastFinalisee = await this.prisma.vente.findFirst({
      where: { statut: 'FINALISEE' },
      orderBy: { createdAt: 'desc' },
      select: { hash: true },
    })
    const hashPrecedent = lastFinalisee?.hash ?? null

    const now = new Date()
    const hash = createHmac('sha256', process.env.SIGNING_SECRET ?? '')
      .update(
        JSON.stringify({
          numero: numeroTicket,
          date: now.toISOString(),
          totalTTC: String(dto.totalTTC),
          vendeurId: dto.vendeurId,
          hashPrecedent,
        }),
      )
      .digest('hex')

    const vente = await this.prisma.$transaction(async (tx) => {
      const created = await tx.vente.create({
        data: {
          numeroTicket,
          vendeurId: dto.vendeurId,
          date: now,
          totalHT: dto.totalHT,
          totalTVA: dto.totalTVA,
          totalTTC: dto.totalTTC,
          statut: 'FINALISEE',
          hash,
          hashPrecedent,
          lignes: {
            create: dto.lignes.map((l) => {
              const remise = l.remise ?? 0
              const montantHT = Math.round(l.prixUnitaireHT * l.qte * (1 - remise / 100) * 10000) / 10000
              const montantTVA = Math.round(montantHT * (l.tauxTVA / 100) * 10000) / 10000
              const montantTTC = Math.round((montantHT + montantTVA) * 10000) / 10000
              return {
                varianteProduitId: l.varianteProduitId,
                qte: l.qte,
                prixUnitaireHT: l.prixUnitaireHT,
                tauxTVA: l.tauxTVA,
                montantHT,
                montantTVA,
                montantTTC,
                remise,
              }
            }),
          },
          paiements: {
            create: dto.paiements.map((p) => ({
              mode: p.mode as 'ESPECES' | 'CB' | 'CHEQUE' | 'VIREMENT' | 'TICKET_RESTO',
              montant: p.montant,
              renduMonnaie: p.renduMonnaie ?? 0,
              ...(p.reference && { reference: p.reference }),
            })),
          },
        },
        include: {
          vendeur: { select: { id: true, nom: true, prenom: true } },
          lignes: {
            include: {
              variante: {
                include: { produit: { select: { id: true, nom: true } } },
              },
            },
          },
          paiements: true,
        },
      })

      return created
    })

    return vente
  }

  async annuler(id: string, dto: AnnulerVenteDto, userId: string) {
    const vente = await this.prisma.vente.findUnique({ where: { id } })
    if (!vente) throw new NotFoundException('Vente introuvable')
    if (vente.statut !== 'FINALISEE') {
      throw new BadRequestException('Seules les ventes finalisées peuvent être annulées')
    }

    return this.prisma.vente.update({
      where: { id },
      data: {
        statut: 'ANNULEE',
        motifAnnulation: dto.motif,
      },
      select: {
        id: true,
        numeroTicket: true,
        statut: true,
        motifAnnulation: true,
        updatedAt: true,
      },
    })
  }
}
