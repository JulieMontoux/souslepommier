import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { computeDayStats } from '@/lib/compute-stats'

export async function GET(_req: Request, { params }: { params: Promise<{ date: string }> }) {
  const { error } = await requireAuth(['GERANT'])
  if (error) return error

  const { date } = await params
  const parsed = new Date(date)
  if (isNaN(parsed.getTime())) {
    return NextResponse.json({ error: 'Date invalide (format: YYYY-MM-DD)' }, { status: 400 })
  }

  const stats = await computeDayStats(prisma, parsed)
  return NextResponse.json(stats)
}
