import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ClotureDetailView } from '@/components/clotures/cloture-detail'
import type {
  ClotureDetail,
  RecapVendeur,
  RecapTVALine,
  RecapProduit,
  VenteAnnuleeInfo,
} from '@/types/cloture'

export const metadata = { title: 'Clôture — Sous le Pommier' }

export default async function ClotureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const c = await prisma.clotureCaisse.findUnique({
    where: { id },
    include: { gerant: { select: { prenom: true, nom: true } } },
  })
  if (!c) notFound()

  const cloture: ClotureDetail = {
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

  return <ClotureDetailView cloture={cloture} />
}
