import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { computeVenteHash } from '@/lib/vente-hash'
import { computeClotureHash } from '@/lib/cloture-hash'

export async function GET() {
  const { error } = await requireAuth(['GERANT'])
  if (error) return error

  const [ventes, clotures] = await Promise.all([
    prisma.vente.findMany({
      where: { statut: 'FINALISEE' },
      select: {
        id: true,
        numeroTicket: true,
        date: true,
        totalTTC: true,
        vendeurId: true,
        hash: true,
        hashPrecedent: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.clotureCaisse.findMany({
      select: {
        id: true,
        numeroCloture: true,
        date: true,
        totalTTC: true,
        gerantId: true,
        hashCumulatif: true,
      },
      orderBy: { numeroCloture: 'asc' },
    }),
  ])

  // Verify ventes chain
  const ventesErrors: string[] = []
  let prevHash = ''
  for (const v of ventes) {
    const expected = computeVenteHash({
      numero: v.numeroTicket,
      date: v.date.toISOString(),
      totalTTC: String(Number(v.totalTTC)),
      vendeurId: v.vendeurId,
      hashPrecedent: prevHash,
    })
    if (v.hash !== expected) {
      ventesErrors.push(`Vente ${v.numeroTicket} : hash invalide`)
    }
    prevHash = v.hash
  }

  // Verify clotures chain
  const cloturesErrors: string[] = []
  let prevClotureHash = ''
  for (const c of clotures) {
    const expected = computeClotureHash({
      numero: c.numeroCloture,
      date: c.date.toISOString(),
      totalTTC: Number(c.totalTTC).toFixed(4),
      gerantId: c.gerantId,
      hashPrecedent: prevClotureHash,
    })
    if (c.hashCumulatif !== expected) {
      cloturesErrors.push(`Clôture n°${c.numeroCloture} : hash invalide`)
    }
    prevClotureHash = c.hashCumulatif
  }

  const valid = ventesErrors.length === 0 && cloturesErrors.length === 0

  return NextResponse.json({
    valid,
    nbVentesVerifiees: ventes.length,
    nbCloturesVerifiees: clotures.length,
    erreurs: [...ventesErrors, ...cloturesErrors],
    verifiedAt: new Date().toISOString(),
  })
}
