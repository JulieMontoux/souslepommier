import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { factureStatutSchema } from '@/lib/validations/facture'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth(['GERANT'])
  if (error) return error

  const { id } = await params
  const facture = await prisma.facture.findUnique({ where: { id } })
  if (!facture) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = factureStatutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const { statut } = parsed.data

  const transitions: Record<string, string[]> = {
    BROUILLON: ['EMISE'],
    EMISE: ['PAYEE'],
  }

  if (!transitions[facture.statut]?.includes(statut)) {
    return NextResponse.json(
      { error: `Transition invalide : ${facture.statut} → ${statut}` },
      { status: 422 }
    )
  }

  const updated = await prisma.facture.update({
    where: { id },
    data: {
      statut,
      ...(statut === 'PAYEE' && 'datePaiement' in parsed.data
        ? { datePaiement: new Date(parsed.data.datePaiement) }
        : {}),
    },
  })

  const userId = (session?.user as { id?: string })?.id
  const action = statut === 'EMISE' ? 'EMIT_FACTURE' : 'PAY_FACTURE'
  await logAudit({
    userId,
    action,
    entite: 'Facture',
    entiteId: id,
    ancienneValeur: { statut: facture.statut },
    nouvelleValeur: { statut: updated.statut },
  })

  return NextResponse.json({ id: updated.id, statut: updated.statut })
}
