import { PrismaService } from '../prisma/prisma.service'
import type { Prisma } from '@souslepommier/database'

export async function logAudit(
  prisma: PrismaService,
  data: {
    userId?: string
    action: string
    entite: string
    entiteId?: string
    ancienneValeur?: Record<string, unknown>
    nouvelleValeur?: Record<string, unknown>
    ip?: string
    userAgent?: string
  },
): Promise<void> {
  await prisma.journalAudit.create({
    data: {
      userId: data.userId,
      action: data.action,
      entite: data.entite,
      entiteId: data.entiteId,
      ancienneValeur: data.ancienneValeur as Prisma.InputJsonValue | undefined,
      nouvelleValeur: data.nouvelleValeur as Prisma.InputJsonValue | undefined,
      ip: data.ip,
      userAgent: data.userAgent,
    },
  })
}
