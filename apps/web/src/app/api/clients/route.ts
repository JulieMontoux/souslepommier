import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { clientCreateSchema } from '@/lib/validations/client'

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() || undefined
  const actifParam = searchParams.get('actif')
  const actif = actifParam === 'false' ? false : actifParam === 'true' ? true : undefined

  const clients = await prisma.client.findMany({
    where: {
      ...(q && {
        OR: [
          { raisonSociale: { contains: q, mode: 'insensitive' } },
          { siret: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      }),
      ...(actif !== undefined && { actif }),
    },
    orderBy: { raisonSociale: 'asc' },
  })

  return NextResponse.json(clients)
}

export async function POST(req: Request) {
  const { error, session } = await requireAuth(['GERANT'])
  if (error) return error

  const body = await req.json()
  const parsed = clientCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  if (parsed.data.siret) {
    const conflict = await prisma.client.findUnique({ where: { siret: parsed.data.siret } })
    if (conflict) {
      return NextResponse.json({ error: 'Un client avec ce SIRET existe déjà' }, { status: 409 })
    }
  }

  const client = await prisma.client.create({ data: parsed.data })

  await logAudit({
    userId: (session!.user as { id?: string })?.id,
    action: 'CREATE',
    entite: 'Client',
    entiteId: client.id,
    nouvelleValeur: { raisonSociale: client.raisonSociale },
  })

  return NextResponse.json(client, { status: 201 })
}
