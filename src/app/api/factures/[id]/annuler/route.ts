import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { factureAnnulationSchema } from '@/lib/validations/facture'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth(['GERANT'])
  if (error) return error

  const { id } = await params
  const facture = await prisma.facture.findUnique({
    where: { id },
    include: { lignes: true },
  })
  if (!facture) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

  if (facture.statut !== 'EMISE') {
    return NextResponse.json(
      { error: 'Seule une facture émise peut être annulée' },
      { status: 422 }
    )
  }

  if (facture.factureOriginaleId) {
    return NextResponse.json({ error: 'Un avoir ne peut pas être annulé' }, { status: 422 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = factureAnnulationSchema.safeParse(body)
  const motif = parsed.success ? (parsed.data.motif ?? null) : null

  const avoir = await prisma.$transaction(
    async (tx) => {
      // Annuler la facture originale
      await tx.facture.update({ where: { id }, data: { statut: 'ANNULEE' } })

      // Numérotation avoir
      const year = new Date().getFullYear()
      const last = await tx.facture.findFirst({
        where: { numero: { startsWith: `AVO-${year}-` } },
        orderBy: { numero: 'desc' },
        select: { numero: true },
      })
      const seq = last ? parseInt(last.numero.split('-')[2]) + 1 : 1
      const numero = `AVO-${year}-${String(seq).padStart(5, '0')}`

      return tx.facture.create({
        data: {
          numero,
          clientId: facture.clientId,
          factureOriginaleId: id,
          statut: 'EMISE',
          totalHT: -Number(facture.totalHT),
          totalTVA: -Number(facture.totalTVA),
          totalTTC: -Number(facture.totalTTC),
          notes: motif ? `Avoir suite annulation : ${motif}` : 'Avoir suite annulation',
          lignes: {
            create: facture.lignes.map((l) => ({
              designation: l.designation,
              qte: Number(l.qte),
              prixUnitaireHT: Number(l.prixUnitaireHT),
              tauxTVA: Number(l.tauxTVA),
              montantHT: -Number(l.montantHT),
              montantTVA: -Number(l.montantTVA),
              montantTTC: -Number(l.montantTTC),
              remise: Number(l.remise),
            })),
          },
        },
      })
    },
    { isolationLevel: 'Serializable' }
  )

  const userId = (session?.user as { id?: string })?.id
  await Promise.all([
    logAudit({
      userId,
      action: 'ANNULER_FACTURE',
      entite: 'Facture',
      entiteId: id,
      nouvelleValeur: { statut: 'ANNULEE', motif },
    }),
    logAudit({
      userId,
      action: 'CREATE_AVOIR',
      entite: 'Facture',
      entiteId: avoir.id,
      nouvelleValeur: { numero: avoir.numero, factureOriginaleId: id },
    }),
  ])

  return NextResponse.json({ avoir: { id: avoir.id, numero: avoir.numero } }, { status: 201 })
}
