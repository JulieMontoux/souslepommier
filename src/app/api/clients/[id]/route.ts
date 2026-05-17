import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { clientUpdateSchema } from '@/lib/validations/client'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const client = await prisma.client.findUnique({ where: { id } })
  if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  return NextResponse.json(client)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth(['GERANT'])
  if (error) return error

  const { id } = await params
  const existing = await prisma.client.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = clientUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const {
    siret,
    tvaIntracommunautaire,
    codePostal,
    email,
    telephone,
    adresse,
    ville,
    notes,
    ...rest
  } = parsed.data

  if (siret && siret !== existing.siret) {
    const conflict = await prisma.client.findUnique({ where: { siret } })
    if (conflict) {
      return NextResponse.json({ error: 'Un client avec ce SIRET existe déjà' }, { status: 409 })
    }
  }

  const updated = await prisma.client.update({
    where: { id },
    data: {
      ...rest,
      siret: siret ?? null,
      tvaIntracommunautaire: tvaIntracommunautaire ?? null,
      adresse: adresse ?? null,
      codePostal: codePostal ?? null,
      ville: ville ?? null,
      email: email ?? null,
      telephone: telephone ?? null,
      notes: notes ?? null,
    },
  })

  const userId = (session?.user as { id?: string })?.id
  await logAudit({
    userId,
    action: 'UPDATE',
    entite: 'Client',
    entiteId: id,
    ancienneValeur: { raisonSociale: existing.raisonSociale, actif: existing.actif },
    nouvelleValeur: { raisonSociale: updated.raisonSociale, actif: updated.actif },
  })

  return NextResponse.json(updated)
}
