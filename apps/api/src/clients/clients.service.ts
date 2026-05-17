import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateClientDto, UpdateClientDto } from './clients.controller'

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string, actif?: boolean) {
    return this.prisma.client.findMany({
      where: {
        ...(search && {
          OR: [
            { raisonSociale: { contains: search, mode: 'insensitive' } },
            { siret: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(actif !== undefined && { actif }),
      },
      orderBy: { raisonSociale: 'asc' },
    })
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        factures: {
          select: {
            id: true,
            numero: true,
            dateEmission: true,
            dateEcheance: true,
            statut: true,
            totalTTC: true,
          },
          orderBy: { dateEmission: 'desc' },
        },
      },
    })

    if (!client) throw new NotFoundException('Client introuvable')
    return client
  }

  async create(dto: CreateClientDto) {
    if (dto.siret) {
      const existing = await this.prisma.client.findUnique({ where: { siret: dto.siret } })
      if (existing) throw new ConflictException('Un client avec ce SIRET existe déjà')
    }

    return this.prisma.client.create({ data: dto })
  }

  async update(id: string, dto: UpdateClientDto) {
    const client = await this.prisma.client.findUnique({ where: { id } })
    if (!client) throw new NotFoundException('Client introuvable')

    if (dto.siret && dto.siret !== client.siret) {
      const existing = await this.prisma.client.findUnique({ where: { siret: dto.siret } })
      if (existing) throw new ConflictException('Un client avec ce SIRET existe déjà')
    }

    return this.prisma.client.update({ where: { id }, data: dto })
  }

  async toggleActif(id: string, actif: boolean) {
    const client = await this.prisma.client.findUnique({ where: { id } })
    if (!client) throw new NotFoundException('Client introuvable')

    return this.prisma.client.update({
      where: { id },
      data: { actif },
      select: { id: true, actif: true },
    })
  }
}
