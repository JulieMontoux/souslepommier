import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { UpsertConfigEntrepriseDto } from './config-entreprise.controller'

@Injectable()
export class ConfigEntrepriseService {
  constructor(private readonly prisma: PrismaService) {}

  get() {
    return this.prisma.configEntreprise.findUnique({ where: { id: 'default' } })
  }

  upsert(dto: UpsertConfigEntrepriseDto) {
    return this.prisma.configEntreprise.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        raisonSociale: dto.raisonSociale ?? '',
        ...dto,
      },
      update: {
        ...dto,
      },
    })
  }
}
