import { PrismaClient } from "@souslepommier/database";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter } as ConstructorParameters<
    typeof PrismaClient
  >[0]);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
