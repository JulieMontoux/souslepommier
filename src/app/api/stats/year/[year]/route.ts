import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { computeYearStats } from '@/lib/compute-stats'

export async function GET(_req: Request, { params }: { params: Promise<{ year: string }> }) {
  const { error } = await requireAuth(['GERANT'])
  if (error) return error

  const { year } = await params
  const y = parseInt(year)
  if (isNaN(y) || y < 2000 || y > 2100) {
    return NextResponse.json({ error: 'Année invalide' }, { status: 400 })
  }

  const stats = await computeYearStats(prisma, y)
  return NextResponse.json(stats)
}
