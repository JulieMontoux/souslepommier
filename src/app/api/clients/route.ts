import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { clientCreateSchema } from '@/lib/validations/client'

export async function GET(req: Request) {
  const { error, session } = await requireAuth()
  if (error) return error

  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim()
  const actifOnly = url.searchParams.get('actif') !== 'false'

  const clients = await prisma.client.findMany({
    where: {
      ...(actifOnly ? { actif: true } : {}),
      ...(q
        ? {
            OR: [
              { raisonSociale: { contains: q, mode: 'insensitive' } },
              { siret: { contains: q } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { raisonSociale: 'asc' },
  })

  void session
  return NextResponse.json(clients)
}

export async function POST(req: Request) {
  const { error, session } = await requireAuth(['GERANT'])
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = clientCreateSchema.safeParse(body)
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

  if (siret) {
    const existing = await prisma.client.findUnique({ where: { siret } })
    if (existing) {
      return NextResponse.json({ error: 'Un client avec ce SIRET existe déjà' }, { status: 409 })
    }
  }

  const client = await prisma.client.create({
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
    action: 'CREATE',
    entite: 'Client',
    entiteId: client.id,
    nouvelleValeur: { raisonSociale: client.raisonSociale },
  })

  return NextResponse.json(client, { status: 201 })
}
