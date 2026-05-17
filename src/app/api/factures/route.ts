import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { factureCreateSchema } from '@/lib/validations/facture'
import { roundFiscal, calcMontantTVA } from '@/lib/tva'
import type { StatutFacture } from '@/generated/prisma/client'

const EMBALLAGE_LABELS: Record<string, string> = {
  VRAC: '',
  BARQUETTE: 'barquette',
  FILET: 'filet',
  SAC: 'sac',
  CAISSE: 'caisse',
  PLATEAU: 'plateau',
}

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const url = new URL(req.url)
  const clientId = url.searchParams.get('clientId')
  const statut = url.searchParams.get('statut')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const q = url.searchParams.get('q')

  const factures = await prisma.facture.findMany({
    where: {
      ...(clientId ? { clientId } : {}),
      ...(statut ? { statut: statut as StatutFacture } : {}),
      ...(from || to
        ? {
            dateEmission: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { numero: { contains: q, mode: 'insensitive' } },
              { client: { raisonSociale: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: { client: { select: { raisonSociale: true } } },
    orderBy: { dateEmission: 'desc' },
  })

  return NextResponse.json(
    factures.map((f) => ({
      id: f.id,
      numero: f.numero,
      dateEmission: f.dateEmission.toISOString(),
      dateEcheance: f.dateEcheance?.toISOString() ?? null,
      statut: f.statut,
      totalTTC: Number(f.totalTTC),
      factureOriginaleId: f.factureOriginaleId,
      client: { raisonSociale: f.client.raisonSociale },
    }))
  )
}

export async function POST(req: Request) {
  const { error, session } = await requireAuth(['GERANT'])
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = factureCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const {
    clientId,
    venteId,
    lignes: lignesInput,
    dateEcheance,
    dateLivraison,
    notes,
    statut,
  } = parsed.data

  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  const facture = await prisma.$transaction(
    async (tx) => {
      // Numérotation séquentielle annuelle sans trou
      const year = new Date().getFullYear()
      const last = await tx.facture.findFirst({
        where: { numero: { startsWith: `FAC-${year}-` } },
        orderBy: { numero: 'desc' },
        select: { numero: true },
      })
      const seq = last ? parseInt(last.numero.split('-')[2]) + 1 : 1
      const numero = `FAC-${year}-${String(seq).padStart(5, '0')}`

      // Build lines
      let lignes: Array<{
        designation: string
        qte: number
        prixUnitaireHT: number
        tauxTVA: number
        montantHT: number
        montantTVA: number
        montantTTC: number
        remise: number
      }> = []

      if (venteId) {
        const vente = await tx.vente.findUnique({
          where: { id: venteId },
          include: {
            lignes: {
              include: { variante: { include: { produit: { select: { nom: true } } } } },
            },
          },
        })
        if (!vente) throw new Error('Vente introuvable')
        lignes = vente.lignes.map((l) => {
          const emb = EMBALLAGE_LABELS[l.variante.emballage] ?? ''
          const poids = l.variante.poids ? `${Number(l.variante.poids)} kg` : ''
          const designation = [l.variante.produit.nom, poids, emb].filter(Boolean).join(' ')
          return {
            designation,
            qte: Number(l.qte),
            prixUnitaireHT: Number(l.prixUnitaireHT),
            tauxTVA: Number(l.tauxTVA),
            montantHT: Number(l.montantHT),
            montantTVA: Number(l.montantTVA),
            montantTTC: Number(l.montantTTC),
            remise: Number(l.remise),
          }
        })
      } else {
        if (!lignesInput?.length) throw new Error('Au moins une ligne requise')
        lignes = lignesInput.map((l) => {
          const remiseFactor = 1 - (l.remise ?? 0) / 100
          const puHT = roundFiscal(l.prixUnitaireHT * remiseFactor)
          const montantHT = roundFiscal(puHT * l.qte)
          const montantTVA = calcMontantTVA(montantHT, l.tauxTVA)
          return {
            designation: l.designation,
            qte: l.qte,
            prixUnitaireHT: l.prixUnitaireHT,
            tauxTVA: l.tauxTVA,
            montantHT,
            montantTVA,
            montantTTC: roundFiscal(montantHT + montantTVA),
            remise: l.remise ?? 0,
          }
        })
      }

      const totalHT = roundFiscal(lignes.reduce((s, l) => s + l.montantHT, 0))
      const totalTVA = roundFiscal(lignes.reduce((s, l) => s + l.montantTVA, 0))
      const totalTTC = roundFiscal(totalHT + totalTVA)

      const echeance = dateEcheance
        ? new Date(dateEcheance)
        : client.conditionsPaiement === 0
          ? new Date()
          : new Date(Date.now() + client.conditionsPaiement * 86_400_000)

      return tx.facture.create({
        data: {
          numero,
          clientId,
          venteId: venteId ?? null,
          dateEcheance: echeance,
          dateLivraison: dateLivraison ? new Date(dateLivraison) : null,
          statut,
          totalHT,
          totalTVA,
          totalTTC,
          notes: notes ?? null,
          lignes: {
            create: lignes.map((l) => ({
              designation: l.designation,
              qte: l.qte,
              prixUnitaireHT: l.prixUnitaireHT,
              tauxTVA: l.tauxTVA,
              montantHT: l.montantHT,
              montantTVA: l.montantTVA,
              montantTTC: l.montantTTC,
              remise: l.remise,
            })),
          },
        },
        include: { lignes: true, client: true },
      })
    },
    { isolationLevel: 'Serializable' }
  )

  const userId = (session?.user as { id?: string })?.id
  await logAudit({
    userId,
    action: 'CREATE_FACTURE',
    entite: 'Facture',
    entiteId: facture.id,
    nouvelleValeur: { numero: facture.numero, clientId, totalTTC: Number(facture.totalTTC) },
  })

  return NextResponse.json(
    { id: facture.id, numero: facture.numero, statut: facture.statut },
    { status: 201 }
  )
}
