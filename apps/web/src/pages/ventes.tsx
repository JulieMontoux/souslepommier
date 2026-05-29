import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { ShoppingBasket, ChevronLeft, ChevronRight } from 'lucide-react'

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

type VenteSummary = {
  id: string
  numeroTicket: string
  date: string
  statut: string
  totalTTC: number
  vendeur: { id: string; prenom: string; nom: string }
  paiements: { mode: string; montant: number }[]
  _count: { lignes: number }
}

type Meta = { total: number; page: number; limit: number; totalPages: number }

type User = { id: string; prenom: string; nom: string }

const LIMIT = 50

function todayLocal() {
  return new Date().toISOString().slice(0, 10)
}

function monthStartLocal() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

export default function VentesPage() {
  const [searchParams] = useSearchParams()
  const [from, setFrom] = useState(() => searchParams.get('from') ?? monthStartLocal())
  const [to, setTo] = useState(() => searchParams.get('to') ?? todayLocal())
  const [vendeurId, setVendeurId] = useState(() => searchParams.get('vendeurId') ?? '')
  const [statut, setStatut] = useState(() => searchParams.get('statut') ?? '')
  const [page, setPage] = useState(1)

  const params = new URLSearchParams({ limit: String(LIMIT), page: String(page) })
  if (from) params.set('from', new Date(from).toISOString())
  if (to) {
    const d = new Date(to)
    d.setHours(23, 59, 59, 999)
    params.set('to', d.toISOString())
  }
  if (vendeurId) params.set('vendeurId', vendeurId)
  if (statut) params.set('statut', statut)

  const { data, isLoading } = useQuery<{ data: VenteSummary[]; meta: Meta }>({
    queryKey: ['ventes', from, to, vendeurId, statut, page],
    queryFn: () => api.get(`/ventes?${params}`),
  })

  const { data: users } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
    staleTime: 60_000,
  })

  const ventes = data?.data ?? []
  const meta = data?.meta

  function handleFilter(cb: () => void) {
    cb()
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Ventes</h1>
        {meta && (
          <p className="text-muted-foreground text-sm">
            {meta.total} vente{meta.total !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="border-border bg-card flex flex-wrap gap-3 rounded-xl border p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-muted-foreground text-xs font-medium">Du</label>
          <input
            type="date"
            value={from}
            onChange={(e) => handleFilter(() => setFrom(e.target.value))}
            className="border-border bg-background text-foreground rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-muted-foreground text-xs font-medium">Au</label>
          <input
            type="date"
            value={to}
            onChange={(e) => handleFilter(() => setTo(e.target.value))}
            className="border-border bg-background text-foreground rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none"
          />
        </div>
        <select
          value={vendeurId}
          onChange={(e) => handleFilter(() => setVendeurId(e.target.value))}
          className="border-border bg-background text-foreground rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none"
        >
          <option value="">Tous les vendeurs</option>
          {users?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.prenom} {u.nom}
            </option>
          ))}
        </select>
        <select
          value={statut}
          onChange={(e) => handleFilter(() => setStatut(e.target.value))}
          className="border-border bg-background text-foreground rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none"
        >
          <option value="">Tous les statuts</option>
          <option value="FINALISEE">Finalisée</option>
          <option value="ANNULEE">Annulée</option>
        </select>
      </div>

      {isLoading ? (
        <div className="border-border bg-card flex items-center justify-center rounded-xl border py-16">
          <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      ) : ventes.length === 0 ? (
        <div className="border-border bg-card flex flex-col items-center justify-center rounded-xl border py-16">
          <ShoppingBasket className="text-muted-foreground/40 mb-3 h-8 w-8" />
          <p className="text-muted-foreground text-sm">Aucune vente sur cette période</p>
        </div>
      ) : (
        <>
          <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border bg-muted/40 border-b">
                  <th className="text-muted-foreground px-4 py-3 text-left font-medium">Ticket</th>
                  <th className="text-muted-foreground px-4 py-3 text-left font-medium">Date</th>
                  <th className="text-muted-foreground px-4 py-3 text-left font-medium">Vendeur</th>
                  <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                    Articles
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                    Paiements
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                    Total TTC
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-center font-medium">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {ventes.map((v) => {
                  const statutLabel = STATUT_LABELS[v.statut] ?? {
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
                          timeZone: 'Europe/Paris',
                        })}
                        <span className="text-muted-foreground ml-1.5 text-xs">
                          {new Date(v.date).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Europe/Paris',
                          })}
                        </span>
                      </td>
                      <td className="text-foreground px-4 py-3">
                        {v.vendeur.prenom} {v.vendeur.nom}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-xs">
                        {v._count.lignes} art.
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
                      <td className="text-foreground px-4 py-3 text-right font-semibold tabular-nums">
                        {fmt(Number(v.totalTTC))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={statutLabel.variant}>{statutLabel.label}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                Page {meta.page} / {meta.totalPages} — {meta.total} résultats
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-border bg-card hover:bg-muted flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page === meta.totalPages}
                  className="border-border bg-card hover:bg-muted flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:opacity-40"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
