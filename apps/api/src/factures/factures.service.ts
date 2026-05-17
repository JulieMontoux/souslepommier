import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { prisma } from '@souslepommier/database'
import type { CreateFactureDto, UpdateStatutDto } from './factures.controller'

type StatutFacture = 'BROUILLON' | 'EMISE' | 'PAYEE' | 'ANNULEE'
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

const TRANSITIONS: Record<StatutFacture, StatutFacture[]> = {
  BROUILLON: ['EMISE', 'ANNULEE'],
  EMISE: ['PAYEE', 'ANNULEE'],
  PAYEE: ['ANNULEE'],
  ANNULEE: [],
}

@Injectable()
export class FacturesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(statut?: string, clientId?: string, page = 1) {
    const limit = 20
    const skip = (page - 1) * limit
    const where = {
      ...(statut && { statut: statut as StatutFacture }),
      ...(clientId && { clientId }),
    }

    const [total, items] = await Promise.all([
      this.prisma.facture.count({ where }),
      this.prisma.facture.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dateEmission: 'desc' },
        include: {
          client: { select: { id: true, raisonSociale: true } },
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
    const facture = await this.prisma.facture.findUnique({
      where: { id },
      include: {
        client: true,
        lignes: { orderBy: { id: 'asc' } },
      },
    })

    if (!facture) throw new NotFoundException('Facture introuvable')
    return facture
  }

  async create(dto: CreateFactureDto) {
    const year = dto.dateEmission
      ? new Date(dto.dateEmission).getFullYear()
      : new Date().getFullYear()

    const prefix = `F-${year}-`
    const lastFacture = await this.prisma.facture.findFirst({
      where: { numero: { startsWith: prefix } },
      orderBy: { numero: 'desc' },
    })

    let seq = 1
    if (lastFacture) {
      const parts = lastFacture.numero.split('-')
      const lastSeq = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(lastSeq)) seq = lastSeq + 1
    }
    const numero = `${prefix}${String(seq).padStart(5, '0')}`

    const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } })
    if (!client) throw new NotFoundException('Client introuvable')

    const dateEmission = dto.dateEmission ? new Date(dto.dateEmission) : new Date()
    const conditionsPaiement = client.conditionsPaiement ?? 30
    const dateEcheance = new Date(dateEmission)
    dateEcheance.setDate(dateEcheance.getDate() + conditionsPaiement)

    const totalHT = dto.lignes.reduce((s, l) => {
      const remise = l.remise ?? 0
      return s + l.prixUnitaireHT * l.quantite * (1 - remise / 100)
    }, 0)

    const totalTVA = dto.lignes.reduce((l_acc, l) => {
      const remise = l.remise ?? 0
      const ht = l.prixUnitaireHT * l.quantite * (1 - remise / 100)
      return l_acc + ht * (l.tauxTVA / 100)
    }, 0)

    const totalTTC = totalHT + totalTVA

    return this.prisma.$transaction(async (tx: TxClient) => {
      return tx.facture.create({
        data: {
          numero,
          clientId: dto.clientId,
          ...(dto.venteId && { venteId: dto.venteId }),
          dateEmission,
          dateEcheance,
          statut: 'BROUILLON',
          totalHT,
          totalTVA,
          totalTTC,
          ...(dto.notes && { notes: dto.notes }),
          lignes: {
            create: dto.lignes.map((l) => {
              const remise = l.remise ?? 0
              const montantHT = Math.round(l.prixUnitaireHT * l.quantite * (1 - remise / 100) * 10000) / 10000
              const montantTVA = Math.round(montantHT * (l.tauxTVA / 100) * 10000) / 10000
              const montantTTC = Math.round((montantHT + montantTVA) * 10000) / 10000
              return {
                designation: l.designation,
                qte: l.quantite,
                prixUnitaireHT: l.prixUnitaireHT,
                tauxTVA: l.tauxTVA,
                montantHT,
                montantTVA,
                montantTTC,
                remise,
              }
            }),
          },
        },
        include: { client: true, lignes: true },
      })
    })
  }

  async updateStatut(id: string, dto: UpdateStatutDto) {
    const facture = await this.prisma.facture.findUnique({ where: { id } })
    if (!facture) throw new NotFoundException('Facture introuvable')

    const current = facture.statut as StatutFacture
    const next = dto.statut as StatutFacture
    if (!TRANSITIONS[current].includes(next)) {
      throw new BadRequestException(
        `Transition invalide : ${current} → ${next}`,
      )
    }

    return this.prisma.facture.update({
      where: { id },
      data: { statut: next },
      select: { id: true, numero: true, statut: true, updatedAt: true },
    })
  }

  async annuler(id: string, motif?: string) {
    const facture = await this.prisma.facture.findUnique({ where: { id } })
    if (!facture) throw new NotFoundException('Facture introuvable')
    if (facture.statut === 'ANNULEE') {
      throw new BadRequestException('Facture déjà annulée')
    }

    return this.prisma.facture.update({
      where: { id },
      data: {
        statut: 'ANNULEE',
        ...(motif && { notes: [facture.notes, `Annulée : ${motif}`].filter(Boolean).join('\n') }),
      },
      select: { id: true, numero: true, statut: true, updatedAt: true },
    })
  }
}
