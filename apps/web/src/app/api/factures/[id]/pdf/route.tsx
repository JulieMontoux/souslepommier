import { NextResponse } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { FactureDocument } from '@/components/factures/facture-pdf'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const [facture, configRaw] = await Promise.all([
    prisma.facture.findUnique({
      where: { id },
      include: { client: true, lignes: { orderBy: [{ id: 'asc' }] } },
    }),
    prisma.configEntreprise.findFirst(),
  ])

  if (!facture) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

  const config = configRaw
    ? {
        raisonSociale: configRaw.raisonSociale,
        formeJuridique: configRaw.formeJuridique,
        capitalSocial: configRaw.capitalSocial ? Number(configRaw.capitalSocial) : null,
        siret: configRaw.siret,
        tvaIntracommunautaire: configRaw.tvaIntracommunautaire,
        adresse: configRaw.adresse,
        codePostal: configRaw.codePostal,
        ville: configRaw.ville,
        telephone: configRaw.telephone,
        email: configRaw.email,
        iban: configRaw.iban,
        rcs: configRaw.rcs,
        villeRCS: configRaw.villeRCS,
        regimeTVA: configRaw.regimeTVA,
      }
    : null

  const factureData = {
    id: facture.id,
    numero: facture.numero,
    clientId: facture.clientId,
    venteId: facture.venteId,
    dateEmission: facture.dateEmission.toISOString(),
    dateEcheance: facture.dateEcheance?.toISOString() ?? null,
    datePaiement: facture.datePaiement?.toISOString() ?? null,
    dateLivraison: facture.dateLivraison?.toISOString() ?? null,
    statut: facture.statut as 'BROUILLON' | 'EMISE' | 'PAYEE' | 'ANNULEE',
    totalHT: Number(facture.totalHT),
    totalTVA: Number(facture.totalTVA),
    totalTTC: Number(facture.totalTTC),
    notes: facture.notes,
    factureOriginaleId: facture.factureOriginaleId,
    client: {
      raisonSociale: facture.client.raisonSociale,
      siret: facture.client.siret,
      tvaIntracommunautaire: facture.client.tvaIntracommunautaire,
      adresse: facture.client.adresse,
      codePostal: facture.client.codePostal,
      ville: facture.client.ville,
      pays: facture.client.pays,
      email: facture.client.email,
      telephone: facture.client.telephone,
      conditionsPaiement: facture.client.conditionsPaiement,
    },
    lignes: facture.lignes.map((l) => ({
      id: l.id,
      designation: l.designation,
      qte: Number(l.qte),
      prixUnitaireHT: Number(l.prixUnitaireHT),
      tauxTVA: Number(l.tauxTVA),
      montantHT: Number(l.montantHT),
      montantTVA: Number(l.montantTVA),
      montantTTC: Number(l.montantTTC),
      remise: Number(l.remise),
    })),
  }

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (<FactureDocument facture={factureData} config={config} />) as any
  )

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${facture.numero}.pdf"`,
    },
  })
}
