import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const tauxSchema = z.object({
  libelle: z.string().min(1).max(100),
  taux: z.number().min(0).max(100),
  defaut: z.boolean().default(false),
  dateEffet: z.string().optional(),
})

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const rows = await prisma.tauxTVA.findMany({
    orderBy: [{ actif: 'desc' }, { taux: 'asc' }],
  })

  return NextResponse.json(rows.map((t) => ({ ...t, taux: Number(t.taux) })))
}

export async function POST(req: Request) {
  const { session, error } = await requireAuth(['GERANT'])
  if (error) return error

  const body = await req.json()
  const parsed = tauxSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const data = parsed.data

  if (data.defaut) {
    await prisma.tauxTVA.updateMany({ data: { defaut: false } })
  }

  const tva = await prisma.tauxTVA.create({
    data: {
      libelle: data.libelle,
      taux: data.taux,
      defaut: data.defaut,
      dateEffet: data.dateEffet ? new Date(data.dateEffet) : new Date(),
    },
  })

  await logAudit({
    userId: session.user.id,
    action: 'CREATE_TAUX_TVA',
    entite: 'TauxTVA',
    entiteId: tva.id,
    nouvelleValeur: { libelle: tva.libelle, taux: Number(tva.taux) },
  })

  return NextResponse.json({ ...tva, taux: Number(tva.taux) }, { status: 201 })
}
