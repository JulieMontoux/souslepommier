import { prisma } from '@/lib/prisma'
import { FactureList } from '@/components/factures/facture-list'
import type { FactureSummary } from '@/types/facture'

export const metadata = { title: 'Factures — Sous le Pommier' }

export default async function FacturesPage() {
  const factures = await prisma.facture.findMany({
    include: { client: { select: { raisonSociale: true } } },
    orderBy: { dateEmission: 'desc' },
  })

  const serialised: FactureSummary[] = factures.map((f) => ({
    id: f.id,
    numero: f.numero,
    dateEmission: f.dateEmission.toISOString(),
    dateEcheance: f.dateEcheance?.toISOString() ?? null,
    statut: f.statut as FactureSummary['statut'],
    totalTTC: Number(f.totalTTC),
    factureOriginaleId: f.factureOriginaleId,
    client: { raisonSociale: f.client.raisonSociale },
  }))

  return <FactureList factures={serialised} />
}
