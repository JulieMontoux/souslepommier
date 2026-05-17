import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const client = await prisma.client.findUnique({ where: { id } })
  if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  const factures = await prisma.facture.findMany({
    where: { clientId: id },
    orderBy: { dateEmission: 'desc' },
    select: {
      id: true,
      numero: true,
      dateEmission: true,
      dateEcheance: true,
      statut: true,
      totalHT: true,
      totalTVA: true,
      totalTTC: true,
      factureOriginaleId: true,
    },
  })

  return NextResponse.json(
    factures.map((f) => ({
      ...f,
      totalHT: Number(f.totalHT),
      totalTVA: Number(f.totalTVA),
      totalTTC: Number(f.totalTTC),
      dateEmission: f.dateEmission.toISOString(),
      dateEcheance: f.dateEcheance?.toISOString() ?? null,
    }))
  )
}
