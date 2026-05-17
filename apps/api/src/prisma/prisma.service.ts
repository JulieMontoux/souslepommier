import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { prisma } from '@souslepommier/database'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface PrismaService extends Omit<typeof prisma, '$on'> {}

@Injectable()
class PrismaService implements OnModuleInit, OnModuleDestroy {
  constructor() {
    Object.assign(this, prisma)
  }

  async onModuleInit() {
    await prisma.$connect()
  }

  async onModuleDestroy() {
    await prisma.$disconnect()
  }
}

export { PrismaService }
