import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { computeClotureApercu } from '@/lib/compute-cloture'
import { computeClotureHash } from '@/lib/cloture-hash'
import type { Prisma } from '@souslepommier/database'

export async function GET(_req: Request) {
  const { error } = await requireAuth(['GERANT'])
  if (error) return error

  const clotures = await prisma.clotureCaisse.findMany({
    orderBy: { numeroCloture: 'desc' },
    select: {
      id: true,
      numeroCloture: true,
      date: true,
      nbVentes: true,
      totalTTC: true,
    },
  })

  return NextResponse.json(
    clotures.map((c) => ({
      id: c.id,
      numeroCloture: c.numeroCloture,
      date: c.date.toISOString(),
      nbVentes: c.nbVentes,
      totalTTC: Number(c.totalTTC),
    }))
  )
}

export async function POST(_req: Request) {
  const { error, session } = await requireAuth(['GERANT'])
  if (error) return error

  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  // Check not already clôturée today
  const existing = await prisma.clotureCaisse.findFirst({
    where: { date: { gte: start, lte: end } },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'La journée est déjà clôturée (clôture n°' + existing.numeroCloture + ')' },
      { status: 409 }
    )
  }

  const apercu = await computeClotureApercu(prisma, now)

  const cloture = await prisma.$transaction(
    async (tx) => {
      // Numéro séquentiel
      const last = await tx.clotureCaisse.findFirst({
        orderBy: { numeroCloture: 'desc' },
        select: { numeroCloture: true, hashCumulatif: true },
      })
      const numeroCloture = (last?.numeroCloture ?? 0) + 1
      const hashPrecedent = last?.hashCumulatif ?? ''

      const hash = computeClotureHash({
        numero: numeroCloture,
        date: now.toISOString(),
        totalTTC: apercu.totalTTC.toFixed(4),
        gerantId: (session?.user as { id?: string })?.id ?? '',
        hashPrecedent,
      })

      return tx.clotureCaisse.create({
        data: {
          numeroCloture,
          date: now,
          gerantId: (session?.user as { id?: string })?.id ?? '',
          nbVentes: apercu.nbVentes,
          totalEspeces: apercu.totalEspeces,
          totalCB: apercu.totalCB,
          totalCheque: apercu.totalCheque,
          totalVirement: apercu.totalVirement,
          totalTR: apercu.totalTR,
          totalVentes: apercu.totalTTC,
          totalHT: apercu.totalHT,
          totalTVA: apercu.totalTVA,
          totalTTC: apercu.totalTTC,
          recapVendeurs: apercu.recapVendeurs as Prisma.InputJsonValue,
          recapTVA: apercu.recapTVA as Prisma.InputJsonValue,
          recapProduits: apercu.recapProduits as Prisma.InputJsonValue,
          ventesAnnulees: apercu.ventesAnnulees as Prisma.InputJsonValue,
          hashCumulatif: hash,
        },
      })
    },
    { isolationLevel: 'Serializable' }
  )

  const userId = (session?.user as { id?: string })?.id
  await logAudit({
    userId,
    action: 'CLOTURE_CAISSE',
    entite: 'ClotureCaisse',
    entiteId: cloture.id,
    nouvelleValeur: {
      numeroCloture: cloture.numeroCloture,
      totalTTC: Number(cloture.totalTTC),
      nbVentes: cloture.nbVentes,
    },
  })

  return NextResponse.json(
    { id: cloture.id, numeroCloture: cloture.numeroCloture },
    { status: 201 }
  )
}
