import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const patchSchema = z.object({
  statut: z.enum(['EN_COURS', 'TRAITEE', 'REFUSEE']),
  reponse: z.string().max(2000).optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const { session, error } = await requireAuth(['GERANT'])
  if (error) return error

  const { id } = await params
  const existing = await prisma.demandeRGPD.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const demande = await prisma.demandeRGPD.update({
    where: { id },
    data: {
      statut: parsed.data.statut,
      reponse: parsed.data.reponse ?? null,
      traitePar: session.user.id,
      traiteAt: new Date(),
    },
  })

  await logAudit({
    userId: session.user.id,
    action: 'PROCESS_DEMANDE_RGPD',
    entite: 'DemandeRGPD',
    entiteId: id,
    ancienneValeur: { statut: existing.statut },
    nouvelleValeur: { statut: demande.statut },
  })

  return NextResponse.json(demande)
}
