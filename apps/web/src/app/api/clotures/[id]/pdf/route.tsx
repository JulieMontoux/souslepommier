import { NextResponse } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { ClotureDocument } from '@/components/clotures/cloture-pdf'
import type { RecapVendeur, RecapTVALine, RecapProduit, VenteAnnuleeInfo } from '@/types/cloture'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(['GERANT'])
  if (error) return error

  const { id } = await params
  const [c, config] = await Promise.all([
    prisma.clotureCaisse.findUnique({
      where: { id },
      include: { gerant: { select: { prenom: true, nom: true } } },
    }),
    prisma.configEntreprise.findFirst({ select: { raisonSociale: true } }),
  ])

  if (!c) return NextResponse.json({ error: 'Clôture introuvable' }, { status: 404 })

  const clotureData = {
    id: c.id,
    numeroCloture: c.numeroCloture,
    date: c.date.toISOString(),
    createdAt: c.createdAt.toISOString(),
    gerantId: c.gerantId,
    gerantPrenom: c.gerant.prenom,
    gerantNom: c.gerant.nom,
    nbVentes: c.nbVentes,
    totalEspeces: Number(c.totalEspeces),
    totalCB: Number(c.totalCB),
    totalCheque: Number(c.totalCheque),
    totalVirement: Number(c.totalVirement),
    totalTR: Number(c.totalTR),
    totalHT: Number(c.totalHT),
    totalTVA: Number(c.totalTVA),
    totalTTC: Number(c.totalTTC),
    recapVendeurs: (c.recapVendeurs ?? []) as RecapVendeur[],
    recapTVA: (c.recapTVA ?? []) as RecapTVALine[],
    recapProduits: (c.recapProduits ?? []) as RecapProduit[],
    ventesAnnulees: (c.ventesAnnulees ?? []) as VenteAnnuleeInfo[],
    hashCumulatif: c.hashCumulatif,
  }

  const el = (
    <ClotureDocument
      cloture={clotureData}
      raisonSociale={config?.raisonSociale ?? 'Sous le Pommier'}
    />
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(el as any)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Z-caisse-${c.numeroCloture}.pdf"`,
    },
  })
}
