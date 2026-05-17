import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const createSchema = z.object({
  type: z.enum(['ACCES', 'RECTIFICATION', 'EFFACEMENT', 'PORTABILITE', 'OPPOSITION']),
  nom: z.string().min(1).max(200),
  email: z.string().email(),
  message: z.string().max(2000).optional(),
})

export async function GET() {
  const { error } = await requireAuth(['GERANT'])
  if (error) return error

  const demandes = await prisma.demandeRGPD.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(demandes)
}

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const demande = await prisma.demandeRGPD.create({
    data: {
      type: parsed.data.type,
      nom: parsed.data.nom,
      email: parsed.data.email,
      message: parsed.data.message ?? null,
    },
  })

  await logAudit({
    action: 'CREATE_DEMANDE_RGPD',
    entite: 'DemandeRGPD',
    entiteId: demande.id,
    nouvelleValeur: { type: demande.type, email: demande.email },
  })

  return NextResponse.json(demande, { status: 201 })
}
