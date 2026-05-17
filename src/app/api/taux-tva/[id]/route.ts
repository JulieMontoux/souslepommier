import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const updateSchema = z.object({
  libelle: z.string().min(1).max(100).optional(),
  taux: z.number().min(0).max(100).optional(),
  defaut: z.boolean().optional(),
  dateEffet: z.string().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: Request, { params }: Params) {
  const { session, error } = await requireAuth(['GERANT'])
  if (error) return error

  const { id } = await params
  const existing = await prisma.tauxTVA.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const data = parsed.data

  if (data.defaut) {
    await prisma.tauxTVA.updateMany({ where: { id: { not: id } }, data: { defaut: false } })
  }

  const tva = await prisma.tauxTVA.update({
    where: { id },
    data: {
      ...(data.libelle !== undefined && { libelle: data.libelle }),
      ...(data.taux !== undefined && { taux: data.taux }),
      ...(data.defaut !== undefined && { defaut: data.defaut }),
      ...(data.dateEffet !== undefined && { dateEffet: new Date(data.dateEffet) }),
    },
  })

  await logAudit({
    userId: session.user.id,
    action: 'UPDATE_TAUX_TVA',
    entite: 'TauxTVA',
    entiteId: id,
    ancienneValeur: { libelle: existing.libelle, taux: Number(existing.taux) },
    nouvelleValeur: { libelle: tva.libelle, taux: Number(tva.taux) },
  })

  return NextResponse.json({ ...tva, taux: Number(tva.taux) })
}

export async function PATCH(req: Request, { params }: Params) {
  const { session, error } = await requireAuth(['GERANT'])
  if (error) return error

  const { id } = await params
  const existing = await prisma.tauxTVA.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const { actif } = (await req.json()) as { actif: boolean }

  const tva = await prisma.tauxTVA.update({ where: { id }, data: { actif } })

  await logAudit({
    userId: session.user.id,
    action: 'TOGGLE_TAUX_TVA',
    entite: 'TauxTVA',
    entiteId: id,
    nouvelleValeur: { actif },
  })

  return NextResponse.json({ ...tva, taux: Number(tva.taux) })
}
