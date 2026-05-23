import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { ShoppingBasket } from 'lucide-react'

export const metadata = { title: 'Ventes — Sous le Pommier' }

const STATUT_LABELS: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' }
> = {
  FINALISEE: { label: 'Finalisée', variant: 'default' },
  ANNULEE: { label: 'Annulée', variant: 'destructive' },
}

const MODE_LABELS: Record<string, string> = {
  ESPECES: 'Espèces',
  CB: 'CB',
  CHEQUE: 'Chèque',
  VIREMENT: 'Virement',
  TICKET_RESTO: 'Ticket resto',
}

function fmt(n: number) {
  return n.toFixed(2).replace('.', ',') + ' €'
}

export default async function VentesPage() {
  const ventes = await prisma.vente.findMany({
    orderBy: { date: 'desc' },
    take: 100,
    include: {
      vendeur: { select: { prenom: true, nom: true } },
      paiements: { select: { mode: true, montant: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Ventes</h1>
        <p className="text-muted-foreground text-sm">
          {ventes.length} vente{ventes.length !== 1 ? 's' : ''} (100 dernières)
        </p>
      </div>

      {ventes.length === 0 ? (
        <div className="border-border bg-card flex flex-col items-center justify-center rounded-xl border py-16">
          <ShoppingBasket className="text-muted-foreground/40 mb-3 h-8 w-8" />
          <p className="text-muted-foreground text-sm">Aucune vente enregistrée</p>
        </div>
      ) : (
        <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/40 border-b">
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">Ticket</th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">Date</th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">Vendeur</th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">Paiements</th>
                <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                  Total TTC
                </th>
                <th className="text-muted-foreground px-4 py-3 text-center font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {ventes.map((v) => {
                const statut = STATUT_LABELS[v.statut] ?? {
                  label: v.statut,
                  variant: 'secondary' as const,
                }
                return (
                  <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                    <td className="text-muted-foreground px-4 py-3 font-mono text-xs">
                      {v.numeroTicket}
                    </td>
                    <td className="text-foreground px-4 py-3">
                      {new Date(v.date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                      <span className="text-muted-foreground ml-1.5">
                        {new Date(v.date).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="text-foreground px-4 py-3">
                      {v.vendeur.prenom} {v.vendeur.nom}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {v.paiements.map((p, i) => (
                          <span
                            key={i}
                            className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs"
                          >
                            {MODE_LABELS[p.mode] ?? p.mode}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-foreground px-4 py-3 text-right font-semibold">
                      {fmt(Number(v.totalTTC))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={statut.variant}>{statut.label}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
