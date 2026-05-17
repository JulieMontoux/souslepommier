import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateDemandeDto, ProcessDemandeDto } from './rgpd.controller'

@Injectable()
export class RgpdService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.demandeRGPD.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  create(dto: CreateDemandeDto) {
    return this.prisma.demandeRGPD.create({
      data: {
        type: dto.type as 'ACCES' | 'RECTIFICATION' | 'EFFACEMENT' | 'PORTABILITE' | 'OPPOSITION',
        nom: dto.nom,
        email: dto.email,
        message: dto.message,
        statut: 'EN_ATTENTE',
      },
    })
  }

  async process(id: string, dto: ProcessDemandeDto, userId: string) {
    const demande = await this.prisma.demandeRGPD.findUnique({ where: { id } })
    if (!demande) throw new NotFoundException('Demande RGPD introuvable')

    return this.prisma.demandeRGPD.update({
      where: { id },
      data: {
        statut: dto.statut as 'EN_COURS' | 'TRAITEE' | 'REFUSEE',
        ...(dto.reponse !== undefined && { reponse: dto.reponse }),
        traitePar: userId,
        traiteAt: new Date(),
      },
    })
  }

  async exportUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        actif: true,
        createdAt: true,
        lastLoginAt: true,
        rgpdConsent: true,
        rgpdConsentDate: true,
      },
    })
    if (!user) throw new NotFoundException('Utilisateur introuvable')

    const [ventes, auditLogs] = await Promise.all([
      this.prisma.vente.findMany({
        where: { vendeurId: userId },
        orderBy: { date: 'desc' },
        take: 100,
        include: {
          lignes: true,
          paiements: {
            select: { mode: true, montant: true },
          },
        },
      }),
      this.prisma.journalAudit.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 200,
      }),
    ])

    return {
      exportDate: new Date().toISOString(),
      utilisateur: user,
      ventes: ventes.map((v) => ({
        ...v,
        totalHT: Number(v.totalHT),
        totalTVA: Number(v.totalTVA),
        totalTTC: Number(v.totalTTC),
      })),
      journalAudit: auditLogs,
    }
  }
}
