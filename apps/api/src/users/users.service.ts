import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateUserDto, UpdateUserDto } from './users.controller'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        actif: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            ventes: {
              where: {
                statut: 'FINALISEE',
                date: { gte: startOfMonth, lte: endOfMonth },
              },
            },
          },
        },
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    })

    return users.map(({ _count, ...user }) => ({
      ...user,
      nbVentesMois: _count.ventes,
    }))
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        actif: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        rgpdConsent: true,
        rgpdConsentDate: true,
      },
    })

    if (!user) throw new NotFoundException('Utilisateur introuvable')

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [nbVentesTotales, caResult] = await Promise.all([
      this.prisma.vente.count({
        where: { vendeurId: id, statut: 'FINALISEE' },
      }),
      this.prisma.vente.aggregate({
        where: { vendeurId: id, statut: 'FINALISEE', date: { gte: thirtyDaysAgo } },
        _sum: { totalTTC: true },
      }),
    ])

    return {
      ...user,
      stats: {
        nbVentesTotales,
        caTTC30j: caResult._sum.totalTTC ?? 0,
      },
    }
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new ConflictException('Email déjà utilisé')

    const passwordHash = await bcrypt.hash(dto.password, 12)

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        nom: dto.nom,
        prenom: dto.prenom,
        role: dto.role ?? 'VENDEUR',
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        actif: true,
        createdAt: true,
      },
    })

    return user
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) throw new NotFoundException('Utilisateur introuvable')

    if (dto.email && dto.email !== user.email) {
      const conflict = await this.prisma.user.findUnique({ where: { email: dto.email } })
      if (conflict) throw new ConflictException('Email déjà utilisé')
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.nom !== undefined && { nom: dto.nom }),
        ...(dto.prenom !== undefined && { prenom: dto.prenom }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.role !== undefined && { role: dto.role }),
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        actif: true,
        updatedAt: true,
      },
    })
  }

  async toggleActif(id: string, actif: boolean, requesterId: string) {
    if (id === requesterId && !actif) {
      throw new BadRequestException('Impossible de se désactiver soi-même')
    }

    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) throw new NotFoundException('Utilisateur introuvable')

    return this.prisma.user.update({
      where: { id },
      data: { actif },
      select: { id: true, actif: true },
    })
  }

  async resetPassword(id: string): Promise<{ plainPassword: string }> {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) throw new NotFoundException('Utilisateur introuvable')

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let plainPassword = ''
    for (let i = 0; i < 8; i++) {
      plainPassword += chars[Math.floor(Math.random() * chars.length)]
    }

    const passwordHash = await bcrypt.hash(plainPassword, 12)
    await this.prisma.user.update({ where: { id }, data: { passwordHash } })

    return { plainPassword }
  }

  async anonymizeRgpd(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) throw new NotFoundException('Utilisateur introuvable')

    return this.prisma.user.update({
      where: { id },
      data: {
        nom: 'Utilisateur supprimé',
        prenom: 'Utilisateur supprimé',
        email: `deleted_${id.slice(0, 8)}@anonymised.local`,
        actif: false,
      },
      select: { id: true, actif: true },
    })
  }
}
