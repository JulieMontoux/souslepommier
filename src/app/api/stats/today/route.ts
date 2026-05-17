import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { computeDayStats } from '@/lib/compute-stats'

export async function GET(_req: Request) {
  const { error } = await requireAuth(['GERANT'])
  if (error) return error

  const stats = await computeDayStats(prisma, new Date())
  return NextResponse.json(stats)
}
