import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  SlidersHorizontal,
  History,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type StockVariante = {
  id: string
  produitId: string
  produitNom: string
  categorieNom: string | null
  poids: number | null
  emballage: string
  venteAuPoids: boolean
  stockActuel: number
  stockMin: number | null
  sku: string | null
}

type Mouvement = {
  id: string
  type: 'ENTREE' | 'SORTIE' | 'AJUSTEMENT' | 'VENTE'
  quantite: number
  motif: string | null
  createdAt: string
  user: { prenom: string; nom: string }
}

const EMBALLAGE_LABELS: Record<string, string> = {
  VRAC: 'Vrac',
  BARQUETTE: 'Barquette',
  FILET: 'Filet',
  SAC: 'Sac',
  CAISSE: 'Caisse',
  PLATEAU: 'Plateau',
}

const TYPE_LABELS: Record<string, string> = {
  ENTREE: 'Entrée',
  SORTIE: 'Sortie',
  AJUSTEMENT: 'Ajustement',
  VENTE: 'Vente',
}

const TYPE_COLORS: Record<string, string> = {
  ENTREE: 'text-green-600 dark:text-green-400',
  SORTIE: 'text-red-500 dark:text-red-400',
  AJUSTEMENT: 'text-blue-600 dark:text-blue-400',
  VENTE: 'text-zinc-500 dark:text-zinc-400',
}

function varianteLabel(v: StockVariante) {
  const emb = EMBALLAGE_LABELS[v.emballage] ?? v.emballage
  if (v.venteAuPoids) return `${emb} (pesée)`
  if (v.poids) return `${v.poids} kg · ${emb}`
  return emb
}

type AdjustDialogProps = {
  variante: StockVariante
  onClose: () => void
}

function AdjustDialog({ variante, onClose }: AdjustDialogProps) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<'ENTREE' | 'SORTIE' | 'AJUSTEMENT'>('ENTREE')
  const [qte, setQte] = useState('')
  const [motif, setMotif] = useState('')
  const [stockMin, setStockMin] = useState(
    variante.stockMin != null ? String(variante.stockMin) : ''
  )
  const unit = variante.venteAuPoids ? 'kg' : 'pcs'

  const mutation = useMutation({
    mutationFn: (data: {
      type: string
      quantite: number
      motif?: string
      stockMin?: number | null
    }) => api.patch(`/stock/${variante.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['stock-alerts'] })
      toast.success('Stock mis à jour')
      onClose()
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const quantite = parseFloat(qte.replace(',', '.'))
    if (isNaN(quantite) || quantite <= 0) {
      toast.error('Quantité invalide')
      return
    }
    const smParsed = stockMin !== '' ? parseFloat(stockMin.replace(',', '.')) : undefined
    mutation.mutate({
      type: mode,
      quantite,
      motif: motif || undefined,
      stockMin: smParsed !== undefined ? (isNaN(smParsed) ? null : smParsed) : undefined,
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {variante.produitNom} — {varianteLabel(variante)}
          </DialogTitle>
        </DialogHeader>

        <div className="text-muted-foreground mb-4 text-sm">
          Stock actuel :{' '}
          <span className="text-foreground font-semibold tabular-nums">
            {variante.venteAuPoids
              ? variante.stockActuel.toFixed(3).replace('.', ',')
              : variante.stockActuel}{' '}
            {unit}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode selector */}
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
            {(['ENTREE', 'SORTIE', 'AJUSTEMENT'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  mode === m
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {m === 'ENTREE' ? 'Entrée' : m === 'SORTIE' ? 'Sortie' : 'Ajustement'}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              {mode === 'AJUSTEMENT' ? `Nouveau stock (${unit})` : `Quantité (${unit})`}
            </label>
            <Input
              type="number"
              min="0"
              step={variante.venteAuPoids ? '0.001' : '1'}
              value={qte}
              onChange={(e) => setQte(e.target.value)}
              placeholder={variante.venteAuPoids ? '0,000' : '0'}
              autoFocus
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Seuil minimum ({unit})</label>
            <Input
              type="number"
              min="0"
              step={variante.venteAuPoids ? '0.001' : '1'}
              value={stockMin}
              onChange={(e) => setStockMin(e.target.value)}
              placeholder="Non défini"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Motif (optionnel)</label>
            <Input
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Livraison, inventaire…"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function HistoryDialog({ variante, onClose }: { variante: StockVariante; onClose: () => void }) {
  const { data: mouvements = [], isLoading } = useQuery<Mouvement[]>({
    queryKey: ['stock', variante.id, 'mouvements'],
    queryFn: () => api.get(`/stock/${variante.id}/mouvements`),
  })

  const unit = variante.venteAuPoids ? 'kg' : 'pcs'

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            Historique — {variante.produitNom} ({varianteLabel(variante)})
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        ) : mouvements.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Aucun mouvement enregistré
          </p>
        ) : (
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {mouvements.map((m) => (
              <div
                key={m.id}
                className="flex items-start justify-between gap-3 rounded-lg px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <div className="min-w-0">
                  <span className={`text-xs font-semibold ${TYPE_COLORS[m.type]}`}>
                    {TYPE_LABELS[m.type]}
                  </span>
                  {m.motif && <span className="text-muted-foreground ml-2 text-xs">{m.motif}</span>}
                  <p className="text-muted-foreground text-[11px]">
                    {m.user.prenom} {m.user.nom} ·{' '}
                    {new Date(m.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${TYPE_COLORS[m.type]}`}
                >
                  {m.type === 'SORTIE' || m.type === 'VENTE'
                    ? '-'
                    : m.type === 'ENTREE'
                      ? '+'
                      : '='}
                  {variante.venteAuPoids
                    ? Number(m.quantite).toFixed(3).replace('.', ',')
                    : Number(m.quantite)}{' '}
                  {unit}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function StockPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterAlerts, setFilterAlerts] = useState(false)
  const [adjusting, setAdjusting] = useState<StockVariante | null>(null)
  const [viewing, setViewing] = useState<StockVariante | null>(null)

  const { data: variantes = [], isLoading } = useQuery<StockVariante[]>({
    queryKey: ['stock'],
    queryFn: () => api.get('/stock'),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const filtered = variantes.filter((v) => {
    if (filterAlerts && !(v.stockMin !== null && v.stockActuel <= v.stockMin)) return false
    if (search) {
      const q = search.toLowerCase()
      if (!v.produitNom.toLowerCase().includes(q) && !(v.sku ?? '').toLowerCase().includes(q))
        return false
    }
    return true
  })

  const alertCount = variantes.filter(
    (v) => v.stockMin !== null && v.stockActuel <= v.stockMin
  ).length

  function stockStatus(v: StockVariante): 'out' | 'low' | 'ok' {
    if (v.stockActuel <= 0) return 'out'
    if (v.stockMin !== null && v.stockActuel <= v.stockMin) return 'low'
    return 'ok'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Stocks</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {variantes.length} variante{variantes.length !== 1 ? 's' : ''} actives
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Input
            placeholder="Rechercher produit, SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-3"
          />
        </div>
        <button
          onClick={() => setFilterAlerts(!filterAlerts)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            filterAlerts
              ? 'bg-amber-500 text-white'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Alertes{alertCount > 0 && ` (${alertCount})`}
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      ) : (
        <div className="border-border bg-card overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b text-left">
                <th className="text-muted-foreground px-4 py-3 font-medium">Produit</th>
                <th className="text-muted-foreground px-4 py-3 font-medium">Variante</th>
                <th className="text-muted-foreground px-4 py-3 text-right font-medium">Stock</th>
                <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                  Seuil min
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted-foreground py-16 text-center text-sm">
                    Aucune variante trouvée
                  </td>
                </tr>
              ) : (
                filtered.map((v) => {
                  const status = stockStatus(v)
                  const unit = v.venteAuPoids ? 'kg' : 'pcs'
                  const stockLabel = v.venteAuPoids
                    ? v.stockActuel.toFixed(3).replace('.', ',')
                    : String(v.stockActuel)
                  return (
                    <tr key={v.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{v.produitNom}</p>
                        {v.categorieNom && (
                          <p className="text-muted-foreground text-xs">{v.categorieNom}</p>
                        )}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-xs">
                        {varianteLabel(v)}
                        {v.sku && <span className="ml-1 opacity-60">· {v.sku}</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                            status === 'out'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                              : status === 'low'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                                : 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'
                          }`}
                        >
                          {status === 'out' ? 'Épuisé' : `${stockLabel} ${unit}`}
                        </span>
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-right text-xs tabular-nums">
                        {v.stockMin != null
                          ? `${v.venteAuPoids ? v.stockMin.toFixed(3).replace('.', ',') : v.stockMin} ${unit}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewing(v)}
                            title="Historique"
                            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setAdjusting(v)}
                            title="Ajuster le stock"
                            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                          >
                            <SlidersHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {adjusting && <AdjustDialog variante={adjusting} onClose={() => setAdjusting(null)} />}
      {viewing && <HistoryDialog variante={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
