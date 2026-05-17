import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { roundFiscal } from '@/lib/tva'

export async function GET(req: Request) {
  const { error } = await requireAuth(['GERANT'])
  if (error) return error

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const now = new Date()
  const fromDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1)
  const toEnd = to ? new Date(to) : now
  toEnd.setHours(23, 59, 59, 999)

  const ventes = await prisma.vente.findMany({
    where: { date: { gte: fromDate, lte: toEnd }, statut: 'FINALISEE' },
    include: { paiements: true },
  })

  const map = new Map<string, { montant: number; ventesIds: Set<string> }>()
  for (const v of ventes) {
    for (const p of v.paiements) {
      const net =
        p.mode === 'ESPECES' ? Number(p.montant) - Number(p.renduMonnaie) : Number(p.montant)
      const cur = map.get(p.mode)
      if (cur) {
        cur.montant += net
        cur.ventesIds.add(v.id)
      } else {
        map.set(p.mode, { montant: net, ventesIds: new Set([v.id]) })
      }
    }
  }

  return NextResponse.json(
    Array.from(map.entries())
      .map(([mode, v]) => ({ mode, montant: roundFiscal(v.montant), nbVentes: v.ventesIds.size }))
      .sort((a, b) => b.montant - a.montant)
  )
}
