import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateCategorieDto } from './categories.controller'

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.categorie.findMany({
      orderBy: { nom: 'asc' },
      include: { _count: { select: { produits: true } } },
    })
  }

  async create(dto: CreateCategorieDto) {
    const existing = await this.prisma.categorie.findUnique({ where: { nom: dto.nom } })
    if (existing) throw new ConflictException('Une catégorie avec ce nom existe déjà')

    return this.prisma.categorie.create({ data: { nom: dto.nom } })
  }

  async delete(id: string) {
    const categorie = await this.prisma.categorie.findUnique({ where: { id } })
    if (!categorie) throw new NotFoundException('Catégorie introuvable')

    await this.prisma.categorie.delete({ where: { id } })
    return { ok: true }
  }
}
