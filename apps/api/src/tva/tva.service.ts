import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateTauxTvaDto, UpdateTauxTvaDto } from './tva.controller'

@Injectable()
export class TvaService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const items = await this.prisma.tauxTVA.findMany({
      orderBy: [{ actif: 'desc' }, { taux: 'asc' }],
    })
    return items.map((t) => ({
      ...t,
      taux: Number(t.taux),
    }))
  }

  async create(dto: CreateTauxTvaDto) {
    if (dto.defaut) {
      await this.prisma.tauxTVA.updateMany({
        where: { defaut: true },
        data: { defaut: false },
      })
    }

    const created = await this.prisma.tauxTVA.create({
      data: {
        libelle: dto.libelle,
        taux: dto.taux,
        defaut: dto.defaut ?? false,
        dateEffet: dto.dateEffet ? new Date(dto.dateEffet) : undefined,
      },
    })

    return { ...created, taux: Number(created.taux) }
  }

  async update(id: string, dto: UpdateTauxTvaDto) {
    const existing = await this.prisma.tauxTVA.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Taux TVA introuvable')

    if (dto.defaut) {
      await this.prisma.tauxTVA.updateMany({
        where: { defaut: true, id: { not: id } },
        data: { defaut: false },
      })
    }

    const updated = await this.prisma.tauxTVA.update({
      where: { id },
      data: {
        ...(dto.libelle !== undefined && { libelle: dto.libelle }),
        ...(dto.taux !== undefined && { taux: dto.taux }),
        ...(dto.defaut !== undefined && { defaut: dto.defaut }),
        ...(dto.dateEffet !== undefined && { dateEffet: new Date(dto.dateEffet) }),
      },
    })

    return { ...updated, taux: Number(updated.taux) }
  }

  async toggleActif(id: string, actif: boolean) {
    const existing = await this.prisma.tauxTVA.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Taux TVA introuvable')

    const updated = await this.prisma.tauxTVA.update({
      where: { id },
      data: { actif },
    })

    return { ...updated, taux: Number(updated.taux) }
  }
}
