import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { computePeriodStats } from '@/lib/compute-stats'
import { roundFiscal } from '@/lib/tva'

export async function GET(req: Request) {
  const { error } = await requireAuth(['GERANT'])
  if (error) return error

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const limit = parseInt(searchParams.get('limit') ?? '10')

  const now = new Date()
  const fromDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1)
  const toDate = to ? new Date(to) : now

  const ventes = await prisma.vente.findMany({
    where: { date: { gte: fromDate, lte: toDate }, statut: 'FINALISEE' },
    include: {
      lignes: {
        include: { variante: { include: { produit: { select: { id: true, nom: true } } } } },
      },
    },
  })

  const map = new Map<string, { nom: string; qte: number; caHT: number; caTTC: number }>()
  for (const v of ventes) {
    for (const l of v.lignes) {
      const pid = l.variante.produit.id
      const cur = map.get(pid)
      if (cur) {
        cur.qte += Number(l.qte)
        cur.caHT += Number(l.montantHT)
        cur.caTTC += Number(l.montantTTC)
      } else {
        map.set(pid, {
          nom: l.variante.produit.nom,
          qte: Number(l.qte),
          caHT: Number(l.montantHT),
          caTTC: Number(l.montantTTC),
        })
      }
    }
  }

  const result = Array.from(map.entries())
    .map(([produitId, v]) => ({
      produitId,
      nom: v.nom,
      qte: roundFiscal(v.qte),
      caHT: roundFiscal(v.caHT),
      caTTC: roundFiscal(v.caTTC),
    }))
    .sort((a, b) => b.caTTC - a.caTTC)
    .slice(0, limit)

  // Suppress unused import warning
  void computePeriodStats

  return NextResponse.json(result)
}
