import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { computeClotureApercu } from '@/lib/compute-cloture'

export async function GET(_req: Request) {
  const { error } = await requireAuth(['GERANT'])
  if (error) return error

  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  const existing = await prisma.clotureCaisse.findFirst({
    where: { date: { gte: start, lte: end } },
    select: { id: true, numeroCloture: true },
  })

  if (existing) {
    return NextResponse.json({ error: 'already_closed', clotureId: existing.id }, { status: 409 })
  }

  const apercu = await computeClotureApercu(prisma, now)
  return NextResponse.json(apercu)
}
