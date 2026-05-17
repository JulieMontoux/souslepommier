import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const facture = await prisma.facture.findUnique({
    where: { id },
    include: {
      client: true,
      lignes: { orderBy: [{ id: 'asc' }] },
    },
  })

  if (!facture) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

  return NextResponse.json({
    id: facture.id,
    numero: facture.numero,
    clientId: facture.clientId,
    venteId: facture.venteId,
    dateEmission: facture.dateEmission.toISOString(),
    dateEcheance: facture.dateEcheance?.toISOString() ?? null,
    datePaiement: facture.datePaiement?.toISOString() ?? null,
    dateLivraison: facture.dateLivraison?.toISOString() ?? null,
    statut: facture.statut,
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
  })
}
