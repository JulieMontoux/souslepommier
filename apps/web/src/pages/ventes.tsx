import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { api, ApiError } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { ShoppingBasket, ChevronLeft, ChevronRight, Plus, Trash2, X, UserRound } from 'lucide-react'
import { toast } from 'sonner'

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
  client: { id: string; raisonSociale: string } | null
  _count: { lignes: number }
}

type Meta = { total: number; page: number; limit: number; totalPages: number }

type User = { id: string; prenom: string; nom: string }

type PDV = { id: string; nom: string }

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
  const [pointDeVenteId, setPointDeVenteId] = useState('')
  const [page, setPage] = useState(1)
  const [annulerId, setAnnulerId] = useState<string | null>(null)
  const [motif, setMotif] = useState('')
  const [annulerPending, setAnnulerPending] = useState(false)
  const [detachClientId, setDetachClientId] = useState<string | null>(null)
  const [detachPending, setDetachPending] = useState(false)
  const queryClient = useQueryClient()

  const params = new URLSearchParams({ limit: String(LIMIT), page: String(page) })
  if (from) params.set('from', new Date(from).toISOString())
  if (to) {
    const d = new Date(to)
    d.setHours(23, 59, 59, 999)
    params.set('to', d.toISOString())
  }
  if (vendeurId) params.set('vendeurId', vendeurId)
  if (statut) params.set('statut', statut)
  if (pointDeVenteId) params.set('pointDeVenteId', pointDeVenteId)

  const { data, isLoading } = useQuery<{ data: VenteSummary[]; meta: Meta }>({
    queryKey: ['ventes', from, to, vendeurId, statut, pointDeVenteId, page],
    queryFn: () => api.get(`/ventes?${params}`),
  })

  const { data: users } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
    staleTime: 60_000,
  })

  const { data: pdvs = [] } = useQuery<PDV[]>({
    queryKey: ['points-de-vente'],
    queryFn: () => api.get('/points-de-vente'),
    staleTime: 60_000,
  })

  const ventes = data?.data ?? []
  const meta = data?.meta

  function handleFilter(cb: () => void) {
    cb()
    setPage(1)
  }

  async function confirmAnnuler() {
    if (!annulerId) return
    setAnnulerPending(true)
    try {
      await api.post(`/ventes/${annulerId}/annuler`, { motif: motif.trim() || undefined })
      toast.success('Vente annulée')
      setAnnulerId(null)
      setMotif('')
      void queryClient.invalidateQueries({ queryKey: ['ventes'] })
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message || 'Erreur')
      else toast.error('Erreur serveur')
    } finally {
      setAnnulerPending(false)
    }
  }

  async function confirmDetachClient() {
    if (!detachClientId) return
    setDetachPending(true)
    try {
      await api.patch(`/ventes/${detachClientId}/client`, { clientId: null })
      toast.success('Client dissocié')
      setDetachClientId(null)
      void queryClient.invalidateQueries({ queryKey: ['ventes'] })
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message || 'Erreur')
      else toast.error('Erreur serveur')
    } finally {
      setDetachPending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Ventes</h1>
          {meta && (
            <p className="text-muted-foreground text-sm">
              {meta.total} vente{meta.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Link
          to="/dashboard/ventes/saisie-manuelle"
          className="border-border bg-card hover:bg-muted/50 inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Saisie manuelle
        </Link>
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
        {pdvs.length > 0 && (
          <select
            value={pointDeVenteId}
            onChange={(e) => handleFilter(() => setPointDeVenteId(e.target.value))}
            className="border-border bg-background text-foreground rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none"
          >
            <option value="">Tous les points de vente</option>
            {pdvs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </select>
        )}
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
                  <th className="text-muted-foreground px-4 py-3 text-left font-medium">Client</th>
                  <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                    Total TTC
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-center font-medium">
                    Statut
                  </th>
                  <th className="px-4 py-3" />
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
                      <td className="px-4 py-3">
                        {v.client ? (
                          <div className="flex items-center gap-1">
                            <UserRound className="text-muted-foreground h-3 w-3 shrink-0" />
                            <span className="text-foreground max-w-[120px] truncate text-xs">
                              {v.client.raisonSociale}
                            </span>
                            {v.statut === 'FINALISEE' && (
                              <button
                                onClick={() => setDetachClientId(v.id)}
                                className="text-muted-foreground hover:text-destructive ml-0.5 rounded p-0.5 transition-colors"
                                title="Dissocier le client (anonymiser)"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="text-foreground px-4 py-3 text-right font-semibold tabular-nums">
                        {fmt(Number(v.totalTTC))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={statutLabel.variant}>{statutLabel.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {v.statut === 'FINALISEE' && (
                          <button
                            onClick={() => {
                              setAnnulerId(v.id)
                              setMotif('')
                            }}
                            className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
                            title="Annuler la vente"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
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
      {/* Confirm annulation dialog */}
      {annulerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-card border-border w-full max-w-sm rounded-xl border p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-foreground font-semibold">Annuler la vente ?</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Action irréversible — la vente passera en statut Annulée.
                </p>
              </div>
              <button
                onClick={() => setAnnulerId(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-4">
              <label className="text-muted-foreground mb-1 block text-xs font-medium">
                Motif (optionnel)
              </label>
              <input
                type="text"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Ex : erreur de caisse, retour client…"
                className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAnnulerId(null)}
                disabled={annulerPending}
                className="border-border bg-card hover:bg-muted flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmAnnuler}
                disabled={annulerPending}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {annulerPending ? 'En cours…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm detach client dialog */}
      {detachClientId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-card border-border w-full max-w-sm rounded-xl border p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-foreground font-semibold">Dissocier le client ?</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Le client sera retiré de cette vente. La vente reste dans l'historique.
                </p>
              </div>
              <button
                onClick={() => setDetachClientId(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDetachClientId(null)}
                disabled={detachPending}
                className="border-border bg-card hover:bg-muted flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDetachClient}
                disabled={detachPending}
                className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
              >
                {detachPending ? 'En cours…' : 'Dissocier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
