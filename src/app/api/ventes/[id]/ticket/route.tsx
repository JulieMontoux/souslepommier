import { NextResponse } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { recapTVA } from '@/lib/tva'
import { TicketDocument } from '@/components/ticket/ticket-pdf'
import type { TicketVente, ConfigTicket } from '@/types/ticket'

export const dynamic = 'force-dynamic'

const EMBALLAGE_LABELS: Record<string, string> = {
  VRAC: '',
  BARQUETTE: 'barquette',
  FILET: 'filet',
  SAC: 'sac',
  CAISSE: 'caisse',
  PLATEAU: 'plateau',
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params

  const [vente, configRaw] = await Promise.all([
    prisma.vente.findUnique({
      where: { id },
      include: {
        vendeur: { select: { prenom: true, nom: true } },
        lignes: {
          include: { variante: { include: { produit: { select: { nom: true } } } } },
        },
        paiements: true,
      },
    }),
    prisma.configEntreprise.findFirst(),
  ])

  if (!vente) return NextResponse.json({ error: 'Vente introuvable' }, { status: 404 })

  const config: ConfigTicket = configRaw
    ? {
        raisonSociale: configRaw.raisonSociale,
        siret: configRaw.siret,
        tvaIntracommunautaire: configRaw.tvaIntracommunautaire,
        adresse: configRaw.adresse,
        codePostal: configRaw.codePostal,
        ville: configRaw.ville,
        telephone: configRaw.telephone,
      }
    : null

  const lignes = vente.lignes.map((l) => {
    const nomProduit = l.variante.produit.nom
    const emballage = EMBALLAGE_LABELS[l.variante.emballage] ?? ''
    const poids = l.variante.poids ? `${Number(l.variante.poids)} kg` : ''
    const designation = [nomProduit, poids, emballage].filter(Boolean).join(' ')
    return {
      designation,
      qte: Number(l.qte),
      prixUnitaireHT: Number(l.prixUnitaireHT),
      tauxTVA: Number(l.tauxTVA),
      montantTTC: Number(l.montantTTC),
      remise: Number(l.remise),
    }
  })

  const recapTaxes = recapTVA(
    vente.lignes.map((l) => ({ tauxTVA: Number(l.tauxTVA), montantHT: Number(l.montantHT) }))
  )

  const ticketVente: TicketVente = {
    id: vente.id,
    numeroTicket: vente.numeroTicket,
    date: vente.date.toISOString(),
    vendeurPrenom: vente.vendeur.prenom,
    lignes,
    paiements: vente.paiements.map((p) => ({
      mode: p.mode,
      montant: Number(p.montant),
      renduMonnaie: Number(p.renduMonnaie),
      reference: p.reference,
    })),
    recapTaxes,
    totalHT: Number(vente.totalHT),
    totalTVA: Number(vente.totalTVA),
    totalTTC: Number(vente.totalTTC),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(
    (<TicketDocument vente={ticketVente} config={config} />) as any
  )

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="ticket-${vente.numeroTicket}.pdf"`,
    },
  })
}
