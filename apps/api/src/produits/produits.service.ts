import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { TypeEmballage } from '@souslepommier/database'
import type {
  CreateProduitDto,
  UpdateProduitDto,
  CreateVarianteDto,
  UpdateVarianteDto,
} from './produits.controller'

@Injectable()
export class ProduitsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string, categorieId?: string, actif?: boolean) {
    return this.prisma.produit.findMany({
      where: {
        ...(search && {
          nom: { contains: search, mode: 'insensitive' },
        }),
        ...(categorieId && { categorieId }),
        ...(actif !== undefined && { actif }),
      },
      include: {
        categorie: { select: { id: true, nom: true } },
        variantes: {
          where: { actif: actif !== undefined ? actif : undefined },
          orderBy: { poids: 'asc' },
        },
      },
      orderBy: { nom: 'asc' },
    })
  }

  async findOne(id: string) {
    const produit = await this.prisma.produit.findUnique({
      where: { id },
      include: {
        categorie: { select: { id: true, nom: true } },
        variantes: { orderBy: { poids: 'asc' } },
      },
    })

    if (!produit) throw new NotFoundException('Produit introuvable')
    return produit
  }

  create(dto: CreateProduitDto) {
    return this.prisma.produit.create({
      data: {
        nom: dto.nom,
        ...(dto.categorieId && { categorieId: dto.categorieId }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.image !== undefined && { image: dto.image }),
      },
      include: {
        categorie: { select: { id: true, nom: true } },
        variantes: true,
      },
    })
  }

  async update(id: string, dto: UpdateProduitDto) {
    const produit = await this.prisma.produit.findUnique({ where: { id } })
    if (!produit) throw new NotFoundException('Produit introuvable')

    return this.prisma.produit.update({
      where: { id },
      data: {
        ...(dto.nom !== undefined && { nom: dto.nom }),
        ...(dto.categorieId !== undefined && { categorieId: dto.categorieId }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.image !== undefined && { image: dto.image }),
      },
      include: {
        categorie: { select: { id: true, nom: true } },
        variantes: true,
      },
    })
  }

  async toggleActif(id: string, actif: boolean) {
    const produit = await this.prisma.produit.findUnique({ where: { id } })
    if (!produit) throw new NotFoundException('Produit introuvable')

    return this.prisma.produit.update({
      where: { id },
      data: { actif },
      select: { id: true, actif: true },
    })
  }

  async createVariante(produitId: string, dto: CreateVarianteDto) {
    const produit = await this.prisma.produit.findUnique({ where: { id: produitId } })
    if (!produit) throw new NotFoundException('Produit introuvable')

    const prixTTC = Math.round(dto.prixHT * (1 + dto.tauxTVA / 100) * 10000) / 10000

    return this.prisma.varianteProduit.create({
      data: {
        produitId,
        prixHT: dto.prixHT,
        tauxTVA: dto.tauxTVA,
        prixTTC,
        emballage: (dto.emballage ?? 'VRAC') as TypeEmballage,
        ...(dto.poids !== undefined && { poids: dto.poids }),
        ...(dto.sku !== undefined && { sku: dto.sku }),
      },
    })
  }

  async updateVariante(id: string, dto: UpdateVarianteDto) {
    const variante = await this.prisma.varianteProduit.findUnique({ where: { id } })
    if (!variante) throw new NotFoundException('Variante introuvable')

    const prixHT = dto.prixHT !== undefined ? dto.prixHT : Number(variante.prixHT)
    const tauxTVA = dto.tauxTVA !== undefined ? dto.tauxTVA : Number(variante.tauxTVA)
    const prixTTC = Math.round(prixHT * (1 + tauxTVA / 100) * 10000) / 10000

    return this.prisma.varianteProduit.update({
      where: { id },
      data: {
        prixHT,
        tauxTVA,
        prixTTC,
        ...(dto.emballage !== undefined && { emballage: dto.emballage as TypeEmballage }),
        ...(dto.poids !== undefined && { poids: dto.poids }),
        ...(dto.sku !== undefined && { sku: dto.sku }),
      },
    })
  }

  async toggleVarianteActif(id: string, actif: boolean) {
    const variante = await this.prisma.varianteProduit.findUnique({ where: { id } })
    if (!variante) throw new NotFoundException('Variante introuvable')

    return this.prisma.varianteProduit.update({
      where: { id },
      data: { actif },
      select: { id: true, actif: true },
    })
  }
}
