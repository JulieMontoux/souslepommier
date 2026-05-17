import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { annulationSchema } from '@/lib/validations/vente'
import { logAudit } from '@/lib/audit'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth(['GERANT'])
  if (error) return error

  const { id } = await params

  const body = await req.json()
  const parsed = annulationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Motif requis', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const vente = await prisma.vente.findUnique({ where: { id } })
  if (!vente) {
    return NextResponse.json({ error: 'Vente introuvable' }, { status: 404 })
  }
  if (vente.statut === 'ANNULEE') {
    return NextResponse.json({ error: 'Vente déjà annulée' }, { status: 409 })
  }

  const updated = await prisma.vente.update({
    where: { id },
    data: { statut: 'ANNULEE', motifAnnulation: parsed.data.motif },
  })

  await logAudit({
    userId: session!.user.id,
    action: 'ANNULER_VENTE',
    entite: 'Vente',
    entiteId: id,
    ancienneValeur: { statut: vente.statut, totalTTC: Number(vente.totalTTC) } as Record<
      string,
      unknown
    >,
    nouvelleValeur: { statut: 'ANNULEE', motif: parsed.data.motif } as Record<string, unknown>,
  })

  return NextResponse.json(updated)
}
