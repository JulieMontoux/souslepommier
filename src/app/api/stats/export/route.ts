import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { roundFiscal } from '@/lib/tva'

export async function GET(req: Request) {
  const { error } = await requireAuth(['GERANT'])
  if (error) return error

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'Paramètres from et to requis' }, { status: 400 })
  }

  const fromDate = new Date(from)
  const toDate = new Date(to)
  toDate.setHours(23, 59, 59, 999)

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json({ error: 'Dates invalides' }, { status: 400 })
  }

  const lignes = await prisma.ligneVente.findMany({
    where: {
      vente: {
        statut: 'FINALISEE',
        date: { gte: fromDate, lte: toDate },
      },
    },
    select: {
      qte: true,
      prixUnitaireHT: true,
      tauxTVA: true,
      montantHT: true,
      montantTVA: true,
      montantTTC: true,
      variante: {
        select: {
          sku: true,
          emballage: true,
          produit: { select: { nom: true } },
        },
      },
    },
  })

  // Aggregate by product + taux TVA
  type Key = string
  const map = new Map<
    Key,
    {
      nom: string
      sku: string | null
      taux: number
      qte: number
      caHT: number
      tva: number
      caTTC: number
    }
  >()

  for (const l of lignes) {
    const nom = l.variante.produit.nom
    const sku = l.variante.sku
    const taux = Number(l.tauxTVA)
    const key = `${nom}||${taux}`
    const cur = map.get(key)
    if (cur) {
      cur.qte += Number(l.qte)
      cur.caHT += Number(l.montantHT)
      cur.tva += Number(l.montantTVA)
      cur.caTTC += Number(l.montantTTC)
    } else {
      map.set(key, {
        nom,
        sku: sku ?? null,
        taux,
        qte: Number(l.qte),
        caHT: Number(l.montantHT),
        tva: Number(l.montantTVA),
        caTTC: Number(l.montantTTC),
      })
    }
  }

  const rows = Array.from(map.values())
    .sort((a, b) => b.caTTC - a.caTTC)
    .map((r) => ({
      ...r,
      qte: roundFiscal(r.qte),
      caHT: roundFiscal(r.caHT),
      tva: roundFiscal(r.tva),
      caTTC: roundFiscal(r.caTTC),
    }))

  const header = 'Produit;SKU;Taux TVA (%);Quantité;CA HT (€);TVA (€);CA TTC (€)'
  const csvRows = rows.map(
    (r) =>
      `${r.nom};${r.sku ?? ''};${r.taux};${r.qte};${r.caHT.toFixed(2)};${r.tva.toFixed(2)};${r.caTTC.toFixed(2)}`
  )
  const csv = [header, ...csvRows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="stats-${from}-${to}.csv"`,
    },
  })
}
