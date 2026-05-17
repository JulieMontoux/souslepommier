import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { venteCreateSchema } from '@/lib/validations/vente'
import { roundFiscal, calcMontantTVA } from '@/lib/tva'
import { computeVenteHash } from '@/lib/vente-hash'
import { logAudit } from '@/lib/audit'
import type { StatutVente } from '@/generated/prisma/client'

export async function GET(req: Request) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const vendeurId = searchParams.get('vendeurId')
  const statut = searchParams.get('statut')

  let dateFilter: { gte?: Date; lte?: Date } | undefined

  if (dateParam) {
    const d = new Date(dateParam)
    const start = new Date(d)
    start.setHours(0, 0, 0, 0)
    const end = new Date(d)
    end.setHours(23, 59, 59, 999)
    dateFilter = { gte: start, lte: end }
  } else if (from || to) {
    dateFilter = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) dateFilter.lte = new Date(to)
  }

  const ventes = await prisma.vente.findMany({
    where: {
      ...(dateFilter && { date: dateFilter }),
      ...(vendeurId && { vendeurId }),
      ...(statut && { statut: statut as StatutVente }),
    },
    include: {
      vendeur: { select: { id: true, nom: true, prenom: true } },
      lignes: {
        include: { variante: { include: { produit: true } } },
      },
      paiements: true,
    },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(ventes)
}

export async function POST(req: Request) {
  const { error, session } = await requireAuth()
  if (error) return error

  const body = await req.json()
  const parsed = venteCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { lignes: lignesInput, paiements: paiementsInput } = parsed.data

  // Fetch variants
  const varianteIds = lignesInput.map((l) => l.varianteProduitId)
  const variantes = await prisma.varianteProduit.findMany({
    where: { id: { in: varianteIds }, actif: true },
  })

  if (variantes.length !== new Set(varianteIds).size) {
    return NextResponse.json({ error: 'Variante introuvable ou inactive' }, { status: 422 })
  }

  const varianteMap = new Map(variantes.map((v) => [v.id, v]))

  // Compute lines with fiscal rounding
  const lignesComputed = lignesInput.map((ligne) => {
    const variante = varianteMap.get(ligne.varianteProduitId)!
    const prixHT = Number(variante.prixHT)
    const tauxTVA = Number(variante.tauxTVA)
    const remise = ligne.remise ?? 0

    const prixUnitaireHT = roundFiscal(prixHT * (1 - remise / 100))
    const montantHT = roundFiscal(prixUnitaireHT * ligne.qte)
    const montantTVA = calcMontantTVA(montantHT, tauxTVA)
    const montantTTC = roundFiscal(montantHT + montantTVA)

    return {
      varianteProduitId: ligne.varianteProduitId,
      qte: ligne.qte,
      prixUnitaireHT,
      tauxTVA,
      montantHT,
      montantTVA,
      montantTTC,
      remise,
    }
  })

  const totalHT = roundFiscal(lignesComputed.reduce((s, l) => s + l.montantHT, 0))
  const totalTVA = roundFiscal(lignesComputed.reduce((s, l) => s + l.montantTVA, 0))
  const totalTTC = roundFiscal(totalHT + totalTVA)

  // Validate payment coverage
  const totalPaye = roundFiscal(paiementsInput.reduce((s, p) => s + p.montant, 0))
  if (totalPaye < totalTTC - 0.005) {
    return NextResponse.json(
      {
        error: `Paiement insuffisant: ${totalPaye.toFixed(2)} € payé pour ${totalTTC.toFixed(2)} €`,
      },
      { status: 422 }
    )
  }

  // Assign rendu monnaie to first ESPECES paiement
  let renduRestant = roundFiscal(totalPaye - totalTTC)
  const paiementsWithRendu = paiementsInput.map((p) => {
    let renduMonnaie = 0
    if (p.mode === 'ESPECES' && renduRestant > 0) {
      renduMonnaie = roundFiscal(Math.min(renduRestant, p.montant))
      renduRestant = roundFiscal(renduRestant - renduMonnaie)
    }
    return { ...p, renduMonnaie }
  })

  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  const clotureExistante = await prisma.clotureCaisse.findFirst({
    where: { date: { gte: startOfToday, lte: endOfToday } },
    select: { numeroCloture: true },
  })
  if (clotureExistante) {
    return NextResponse.json(
      { error: `Journée clôturée (clôture n°${clotureExistante.numeroCloture})` },
      { status: 409 }
    )
  }

  const vente = await prisma.$transaction(async (tx) => {
    // Ticket number: count today's ventes
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    const count = await tx.vente.count({ where: { date: { gte: startOfDay } } })
    const numeroTicket = `VTE-${dateStr}-${String(count + 1).padStart(4, '0')}`

    // Hash chaining
    const lastVente = await tx.vente.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { hash: true },
    })
    const hashPrecedent = lastVente?.hash ?? ''
    const hash = computeVenteHash({
      numero: numeroTicket,
      date: now.toISOString(),
      totalTTC: String(totalTTC),
      vendeurId: session!.user.id,
      hashPrecedent,
    })

    return tx.vente.create({
      data: {
        numeroTicket,
        vendeurId: session!.user.id,
        date: now,
        totalHT,
        totalTVA,
        totalTTC,
        statut: 'FINALISEE',
        hash,
        hashPrecedent: hashPrecedent || null,
        lignes: {
          create: lignesComputed.map((l) => ({
            varianteProduitId: l.varianteProduitId,
            qte: l.qte,
            prixUnitaireHT: l.prixUnitaireHT,
            tauxTVA: l.tauxTVA,
            montantHT: l.montantHT,
            montantTVA: l.montantTVA,
            montantTTC: l.montantTTC,
            remise: l.remise,
          })),
        },
        paiements: {
          create: paiementsWithRendu.map((p) => ({
            mode: p.mode,
            montant: p.montant,
            renduMonnaie: p.renduMonnaie,
            reference: p.reference ?? null,
          })),
        },
      },
      include: {
        lignes: { include: { variante: { include: { produit: true } } } },
        paiements: true,
        vendeur: { select: { id: true, nom: true, prenom: true } },
      },
    })
  })

  await logAudit({
    userId: session!.user.id,
    action: 'CREATE_VENTE',
    entite: 'Vente',
    entiteId: vente.id,
    nouvelleValeur: { numeroTicket: vente.numeroTicket, totalTTC } as Record<string, unknown>,
  })

  return NextResponse.json(vente, { status: 201 })
}
