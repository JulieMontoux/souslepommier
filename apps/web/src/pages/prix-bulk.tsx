import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeft, Save, Check } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'

type Variante = {
  id: string
  produitId: string
  prixHT: number
  prixTTC: number
  tauxTVA: { id: string; libelle: string; taux: number } | number
  emballage: string
  poids: number | null
  actif: boolean
}

function getTauxNum(v: Variante) {
  return typeof v.tauxTVA === 'object' ? v.tauxTVA.taux : v.tauxTVA
}

type Produit = {
  id: string
  nom: string
  actif: boolean
}

const EMBALLAGE_LABELS: Record<string, string> = {
  VRAC: 'Vrac',
  BARQUETTE: 'Barquette',
  FILET: 'Filet',
  SAC: 'Sac',
  CAISSE: 'Caisse',
  PLATEAU: 'Plateau',
}

function varianteLabel(v: Variante) {
  const parts = [EMBALLAGE_LABELS[v.emballage] ?? v.emballage]
  if (v.poids) parts.push(`${v.poids} kg`)
  return parts.join(' ')
}

export default function PrixBulkPage() {
  const queryClient = useQueryClient()
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const { data: produits } = useQuery<Produit[]>({
    queryKey: ['produits'],
    queryFn: () => api.get('/produits?actif=true'),
  })

  const { data: variantes } = useQuery<Variante[]>({
    queryKey: ['variantes-all'],
    queryFn: () => api.get('/variantes'),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (updates: { id: string; prixHT: number }[]) =>
      api.patch('/variantes/bulk-prix', updates) as Promise<{ updated: number }>,
    onSuccess: (data: { updated: number }) => {
      toast.success(`${data.updated} prix mis à jour`)
      void queryClient.invalidateQueries({ queryKey: ['variantes-all'] })
      void queryClient.invalidateQueries({ queryKey: ['produits'] })
      setEdits({})
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const activeProds = (produits ?? []).filter((p) => p.actif)
  const variantesByProduit = new Map<string, Variante[]>()
  for (const v of variantes ?? []) {
    if (!v.actif) continue
    const list = variantesByProduit.get(v.produitId) ?? []
    list.push(v)
    variantesByProduit.set(v.produitId, list)
  }

  const hasChanges = Object.keys(edits).length > 0

  function handleSave() {
    const updates = Object.entries(edits)
      .map(([id, val]) => ({ id, prixHT: parseFloat(val.replace(',', '.')) }))
      .filter((u) => !isNaN(u.prixHT) && u.prixHT >= 0)
    if (updates.length === 0) return
    mutate(updates)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            to="/dashboard/produits"
            className="text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Produits
          </Link>
          <h1 className="text-foreground text-2xl font-bold">Mise à jour des prix</h1>
          <p className="text-muted-foreground text-sm">
            Modifiez les prix HT directement dans le tableau. Le TTC est calculé automatiquement.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isPending}
          className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saved ? (
            <>
              <Check className="h-4 w-4" /> Enregistré
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Enregistrer ({Object.keys(edits).length} modif.)
            </>
          )}
        </button>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border bg-muted/40 border-b">
              <th className="text-muted-foreground px-4 py-3 text-left font-medium">Produit</th>
              <th className="text-muted-foreground px-4 py-3 text-left font-medium">Variante</th>
              <th className="text-muted-foreground px-4 py-3 text-right font-medium">TVA</th>
              <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                Prix HT (€)
              </th>
              <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                Prix TTC (€)
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {activeProds.flatMap((p) => {
              const pvars = variantesByProduit.get(p.id) ?? []
              return pvars.map((v, vi) => {
                const rawVal = edits[v.id]
                const displayHT =
                  rawVal !== undefined
                    ? rawVal
                    : Number(v.prixHT)
                        .toFixed(4)
                        .replace(/\.?0+$/, '')
                const editedHT =
                  rawVal !== undefined ? parseFloat(rawVal.replace(',', '.')) : Number(v.prixHT)
                const previewTTC = !isNaN(editedHT)
                  ? (editedHT * (1 + getTauxNum(v) / 100)).toFixed(2).replace('.', ',')
                  : '—'
                const isEdited = rawVal !== undefined

                return (
                  <tr
                    key={v.id}
                    className={`transition-colors ${isEdited ? 'bg-amber-50/50 dark:bg-amber-950/20' : 'hover:bg-muted/30'}`}
                  >
                    <td className="text-foreground px-4 py-2.5 font-medium">
                      {vi === 0 ? p.nom : ''}
                    </td>
                    <td className="text-muted-foreground px-4 py-2.5">{varianteLabel(v)}</td>
                    <td className="text-muted-foreground px-4 py-2.5 text-right">
                      {getTauxNum(v)}%
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={displayHT}
                        onChange={(e) => setEdits((prev) => ({ ...prev, [v.id]: e.target.value }))}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value.replace(',', '.'))
                          if (
                            !isNaN(val) &&
                            val.toFixed(4) === Number(v.prixHT).toFixed(4) &&
                            rawVal !== undefined
                          ) {
                            setEdits((prev) => {
                              const next = { ...prev }
                              delete next[v.id]
                              return next
                            })
                          }
                        }}
                        className={`w-24 rounded border px-2 py-1 text-right text-sm tabular-nums focus:ring-2 focus:ring-green-600 focus:outline-none ${isEdited ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' : 'border-border bg-background'}`}
                      />
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right tabular-nums ${isEdited ? 'font-semibold text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}
                    >
                      {isEdited ? previewTTC : Number(v.prixTTC).toFixed(2).replace('.', ',')} €
                    </td>
                  </tr>
                )
              })
            })}
          </tbody>
        </table>
        {activeProds.length === 0 && (
          <div className="text-muted-foreground py-12 text-center text-sm">Aucun produit actif</div>
        )}
      </div>
    </div>
  )
}
