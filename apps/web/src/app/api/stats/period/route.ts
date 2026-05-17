import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { computePeriodStats } from '@/lib/compute-stats'

export async function GET(req: Request) {
  const { error } = await requireAuth(['GERANT'])
  if (error) return error

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'Paramètres from et to requis' }, { status: 400 })
  }

  const fromDate = new Date(from)
  const toDate = new Date(to)
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json({ error: 'Dates invalides' }, { status: 400 })
  }

  const stats = await computePeriodStats(prisma, fromDate, toDate)
  return NextResponse.json(stats)
}
