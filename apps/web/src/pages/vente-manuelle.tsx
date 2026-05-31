import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Link } from 'react-router-dom'

type Variante = {
  id: string
  emballage: string
  poids: number | null
  prixTTC: number
  prixHT: number
  tauxTVA: { id: string; libelle: string; taux: number } | number
  venteAuPoids: boolean
  actif: boolean
}

type ProduitRaw = {
  id: string
  nom: string
  variantes: Variante[]
}

type LigneSaisie = {
  key: string
  varianteProduitId: string
  produitNom: string
  varianteLabel: string
  qte: string
  remise: string
  prixUnitaireHT: number
  tauxTVA: number
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
  const emb = EMBALLAGE_LABELS[v.emballage] ?? v.emballage
  if (v.venteAuPoids) return `${emb} (pesée) — ${v.prixTTC.toFixed(2)} €/kg`
  if (v.poids) return `${v.poids} kg · ${emb} — ${v.prixTTC.toFixed(2)} €`
  return `${emb} — ${v.prixTTC.toFixed(2)} €`
}

export default function VenteManuellePage() {
  const navigate = useNavigate()
  const [date, setDate] = useState(new Date().toLocaleDateString('fr-CA'))
  const [lignes, setLignes] = useState<LigneSaisie[]>([])
  const [modePaiement, setModePaiement] = useState<string>('ESPECES')

  const { data: produits = [] } = useQuery<ProduitRaw[]>({
    queryKey: ['produits', 'all'],
    queryFn: () => api.get('/produits?actif=true&withVariantes=true'),
  })

  const mutation = useMutation({
    mutationFn: (payload: unknown) => api.post('/ventes/manuel', payload),
    onSuccess: () => {
      toast.success('Vente enregistrée')
      navigate('/dashboard/ventes')
    },
    onError: (e: Error) => toast.error(e.message ?? 'Erreur'),
  })

  function addLigne(produitId: string, varianteId: string) {
    const produit = produits.find((p) => p.id === produitId)
    const variante = produit?.variantes.find((v) => v.id === varianteId)
    if (!produit || !variante) return
    setLignes((prev) => [
      ...prev,
      {
        key: `${varianteId}-${Date.now()}`,
        varianteProduitId: varianteId,
        produitNom: produit.nom,
        varianteLabel: varianteLabel(variante),
        qte: variante.venteAuPoids ? '1.000' : '1',
        remise: '0',
        prixUnitaireHT: variante.prixHT,
        tauxTVA: typeof variante.tauxTVA === 'object' ? variante.tauxTVA.taux : variante.tauxTVA,
      },
    ])
  }

  function updateLigne(key: string, field: 'qte' | 'remise', value: string) {
    setLignes((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)))
  }

  function removeLigne(key: string) {
    setLignes((prev) => prev.filter((l) => l.key !== key))
  }

  function totalTTC() {
    return lignes.reduce((sum, l) => {
      const qte = parseFloat(l.qte) || 0
      const remise = parseFloat(l.remise) || 0
      const ht = l.prixUnitaireHT * qte * (1 - remise / 100)
      const ttc = ht * (1 + l.tauxTVA / 100)
      return sum + ttc
    }, 0)
  }

  function handleSubmit() {
    if (lignes.length === 0) {
      toast.error('Ajouter au moins une ligne')
      return
    }
    const ttc = totalTTC()
    if (ttc <= 0) {
      toast.error('Total invalide')
      return
    }

    mutation.mutate({
      date,
      lignes: lignes.map((l) => ({
        varianteProduitId: l.varianteProduitId,
        qte: parseFloat(l.qte),
        ...(parseFloat(l.remise) > 0 && { remise: parseFloat(l.remise) }),
      })),
      paiements: [{ mode: modePaiement, montant: Math.round(ttc * 100) / 100 }],
    })
  }

  const [selectedProduit, setSelectedProduit] = useState('')
  const [selectedVariante, setSelectedVariante] = useState('')

  const produitActif = produits.find((p) => p.id === selectedProduit)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/dashboard/ventes" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-foreground text-2xl font-bold">Saisie manuelle de vente</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Enregistrer des ventes passées (clôture incluse ignorée)
          </p>
        </div>
      </div>

      {/* Date */}
      <div className="border-border bg-card space-y-3 rounded-xl border p-5 shadow-sm">
        <h2 className="font-semibold">Date de la vente</h2>
        <div className="max-w-xs">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toLocaleDateString('fr-CA')}
          />
        </div>
      </div>

      {/* Add line */}
      <div className="border-border bg-card space-y-3 rounded-xl border p-5 shadow-sm">
        <h2 className="font-semibold">Ajouter une ligne</h2>
        <div className="flex flex-wrap gap-3">
          <div className="min-w-48 flex-1">
            <Label>Produit</Label>
            <Select
              value={selectedProduit}
              onValueChange={(v) => {
                if (v) setSelectedProduit(v)
                setSelectedVariante('')
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un produit…" />
              </SelectTrigger>
              <SelectContent>
                {produits.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {produitActif && (
            <div className="min-w-48 flex-1">
              <Label>Variante</Label>
              <Select
                value={selectedVariante}
                onValueChange={(v) => {
                  if (v) setSelectedVariante(v)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {produitActif.variantes
                    .filter((v) => v.actif)
                    .map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {varianteLabel(v)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (selectedProduit && selectedVariante) {
                  addLigne(selectedProduit, selectedVariante)
                  setSelectedVariante('')
                }
              }}
              disabled={!selectedProduit || !selectedVariante}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </div>
      </div>

      {/* Lines table */}
      {lignes.length > 0 && (
        <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b text-left">
                <th className="text-muted-foreground px-4 py-3 font-medium">Produit / Variante</th>
                <th className="text-muted-foreground w-28 px-4 py-3 font-medium">Quantité</th>
                <th className="text-muted-foreground w-24 px-4 py-3 font-medium">Remise %</th>
                <th className="text-muted-foreground w-24 px-4 py-3 text-right font-medium">
                  Total TTC
                </th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {lignes.map((l) => {
                const qte = parseFloat(l.qte) || 0
                const remise = parseFloat(l.remise) || 0
                const ht = l.prixUnitaireHT * qte * (1 - remise / 100)
                const ttc = ht * (1 + l.tauxTVA / 100)
                return (
                  <tr key={l.key} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <p className="font-medium">{l.produitNom}</p>
                      <p className="text-muted-foreground text-xs">{l.varianteLabel}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={l.qte}
                        onChange={(e) => updateLigne(l.key, 'qte', e.target.value)}
                        className="h-8 w-full"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={l.remise}
                        onChange={(e) => updateLigne(l.key, 'remise', e.target.value)}
                        className="h-8 w-full"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {ttc.toFixed(2).replace('.', ',')} €
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => removeLigne(l.key)}
                        className="text-zinc-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-border border-t">
                <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold">
                  Total TTC
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold tabular-nums">
                  {totalTTC().toFixed(2).replace('.', ',')} €
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Payment + submit */}
      {lignes.length > 0 && (
        <div className="border-border bg-card space-y-4 rounded-xl border p-5 shadow-sm">
          <h2 className="font-semibold">Paiement</h2>
          <div className="max-w-xs">
            <Label>Mode de paiement</Label>
            <Select
              value={modePaiement}
              onValueChange={(v) => {
                if (v) setModePaiement(v)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ESPECES">Espèces</SelectItem>
                <SelectItem value="CB">Carte bancaire</SelectItem>
                <SelectItem value="CHEQUE">Chèque</SelectItem>
                <SelectItem value="VIREMENT">Virement</SelectItem>
                <SelectItem value="TICKET_RESTO">Ticket restaurant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} disabled={mutation.isPending} className="gap-2">
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer la vente'}
          </Button>
        </div>
      )}
    </div>
  )
}
