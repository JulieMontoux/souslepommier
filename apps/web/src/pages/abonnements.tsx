import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Calendar, Package, ChevronDown, ChevronUp, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Types ───────────────────────────────────────────────────────────────────

type Variante = {
  id: string
  emballage: string
  poids: number | null
  prixTTC: number
  venteAuPoids: boolean
  produit: { id: string; nom: string }
}

type LigneAbonnement = {
  id: string
  varianteProduitId: string
  qte: number
  variante: Variante
}

type Abonnement = {
  id: string
  nom: string
  frequence: 'HEBDO' | 'BIMENSUEL' | 'MENSUEL'
  actif: boolean
  client: { id: string; raisonSociale: string }
  lignes: LigneAbonnement[]
  _count: { livraisons: number }
}

type Livraison = {
  id: string
  date: string
  statut: 'PLANIFIEE' | 'LIVREE' | 'ANNULEE'
  abonnementId: string
  abonnement: {
    nom: string
    client: { id: string; raisonSociale: string }
  }
}

type Client = { id: string; raisonSociale: string }

type ProduitRaw = {
  id: string
  nom: string
  variantes: Array<{
    id: string
    emballage: string
    poids: number | null
    prixTTC: number
    venteAuPoids: boolean
    actif: boolean
  }>
}

const FREQ_LABELS: Record<string, string> = {
  HEBDO: 'Hebdomadaire',
  BIMENSUEL: 'Bimensuel',
  MENSUEL: 'Mensuel',
}

const EMBALLAGE_LABELS: Record<string, string> = {
  VRAC: 'Vrac',
  BARQUETTE: 'Barquette',
  FILET: 'Filet',
  SAC: 'Sac',
  CAISSE: 'Caisse',
  PLATEAU: 'Plateau',
}

function varianteLabel(v: {
  emballage: string
  poids: number | null
  prixTTC: number
  venteAuPoids: boolean
}) {
  const emb = EMBALLAGE_LABELS[v.emballage] ?? v.emballage
  if (v.venteAuPoids) return `${emb} (pesée) — ${Number(v.prixTTC).toFixed(2)} €/kg`
  if (v.poids) return `${v.poids} kg · ${emb} — ${Number(v.prixTTC).toFixed(2)} €`
  return `${emb} — ${Number(v.prixTTC).toFixed(2)} €`
}

// ─── Ligne form row ───────────────────────────────────────────────────────────

type LigneForm = { produitId: string; varianteId: string; qte: string }

function LigneRow({
  ligne,
  produits,
  onChange,
  onRemove,
}: {
  ligne: LigneForm
  produits: ProduitRaw[]
  onChange: (l: LigneForm) => void
  onRemove: () => void
}) {
  const produit = produits.find((p) => p.id === ligne.produitId)
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-40 flex-1">
        <Select
          value={ligne.produitId}
          onValueChange={(v) => onChange({ ...ligne, produitId: v ?? '', varianteId: '' })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Produit…" />
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
      {produit && (
        <div className="min-w-36 flex-1">
          <Select
            value={ligne.varianteId}
            onValueChange={(v) => onChange({ ...ligne, varianteId: v ?? '' })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Variante…" />
            </SelectTrigger>
            <SelectContent>
              {produit.variantes
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
      <Input
        type="number"
        min="0.001"
        step="0.001"
        value={ligne.qte}
        onChange={(e) => onChange({ ...ligne, qte: e.target.value })}
        placeholder="Qté"
        className="h-8 w-20"
      />
      <button
        type="button"
        onClick={onRemove}
        className="px-1 text-xs text-zinc-400 hover:text-red-500"
      >
        ✕
      </button>
    </div>
  )
}

// ─── Create/Edit dialog ───────────────────────────────────────────────────────

function AbonnementDialog({
  abonnement,
  onClose,
}: {
  abonnement?: Abonnement
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [nom, setNom] = useState(abonnement?.nom ?? '')
  const [clientId, setClientId] = useState(abonnement?.client.id ?? '')
  const [frequence, setFrequence] = useState<string>(abonnement?.frequence ?? 'HEBDO')
  const [lignes, setLignes] = useState<LigneForm[]>(
    () =>
      abonnement?.lignes.map((l) => ({
        produitId: l.variante.produit.id,
        varianteId: l.varianteProduitId,
        qte: String(l.qte),
      })) ?? [{ produitId: '', varianteId: '', qte: '1' }]
  )

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients-all'],
    queryFn: () => api.get('/clients'),
  })

  const { data: produits = [] } = useQuery<ProduitRaw[]>({
    queryKey: ['produits', 'all'],
    queryFn: () => api.get('/produits?actif=true&withVariantes=true'),
  })

  const mutation = useMutation({
    mutationFn: (payload: unknown) =>
      abonnement
        ? api.put(`/abonnements/${abonnement.id}`, payload)
        : api.post('/abonnements', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['abonnements'] })
      toast.success(abonnement ? 'Abonnement mis à jour' : 'Abonnement créé')
      onClose()
    },
    onError: (e: Error) => toast.error(e.message ?? 'Erreur'),
  })

  function handleSubmit() {
    if (!nom.trim()) {
      toast.error('Nom requis')
      return
    }
    if (!clientId) {
      toast.error('Client requis')
      return
    }
    const validLignes = lignes.filter((l) => l.varianteId && parseFloat(l.qte) > 0)
    if (validLignes.length === 0) {
      toast.error('Au moins une ligne requise')
      return
    }

    mutation.mutate({
      nom: nom.trim(),
      clientId,
      frequence,
      lignes: validLignes.map((l) => ({
        varianteProduitId: l.varianteId,
        qte: parseFloat(l.qte),
      })),
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{abonnement ? 'Modifier abonnement' : 'Nouvel abonnement'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nom du panier</Label>
              <Input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Panier hebdo M"
              />
            </div>
            <div>
              <Label>Fréquence</Label>
              <Select
                value={frequence}
                onValueChange={(v) => {
                  if (v) setFrequence(v)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HEBDO">Hebdomadaire</SelectItem>
                  <SelectItem value="BIMENSUEL">Bimensuel</SelectItem>
                  <SelectItem value="MENSUEL">Mensuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Client</Label>
            <Select
              value={clientId}
              onValueChange={(v) => {
                if (v) setClientId(v)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un client…" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.raisonSociale}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Contenu du panier</Label>
            {lignes.map((l, i) => (
              <LigneRow
                key={i}
                ligne={l}
                produits={produits}
                onChange={(updated) =>
                  setLignes((prev) => prev.map((x, j) => (j === i ? updated : x)))
                }
                onRemove={() => setLignes((prev) => prev.filter((_, j) => j !== i))}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() =>
                setLignes((prev) => [...prev, { produitId: '', varianteId: '', qte: '1' }])
              }
            >
              <Plus className="h-3 w-3" />
              Ajouter une ligne
            </Button>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending}>
              {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Plan livraison dialog ────────────────────────────────────────────────────

function PlanLivraisonDialog({
  abonnement,
  onClose,
}: {
  abonnement: Abonnement
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [date, setDate] = useState(new Date().toLocaleDateString('fr-CA'))

  const mutation = useMutation({
    mutationFn: () => api.post(`/abonnements/${abonnement.id}/livraisons`, { date }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['abonnements'] })
      qc.invalidateQueries({ queryKey: ['livraisons-calendrier'] })
      toast.success('Livraison planifiée')
      onClose()
    },
    onError: (e: Error) => toast.error(e.message ?? 'Erreur'),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Planifier une livraison</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-muted-foreground text-sm">
            {abonnement.nom} — {abonnement.client.raisonSociale}
          </p>
          <div>
            <Label>Date de livraison</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Planification…' : 'Planifier'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Livrer dialog ────────────────────────────────────────────────────────────

function LivrerDialog({ livraison, onClose }: { livraison: Livraison; onClose: () => void }) {
  const qc = useQueryClient()
  const [modePaiement, setModePaiement] = useState('VIREMENT')

  const mutation = useMutation({
    mutationFn: () => api.post(`/abonnements/livraisons/${livraison.id}/livrer`, { modePaiement }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['livraisons-calendrier'] })
      qc.invalidateQueries({ queryKey: ['abonnements'] })
      toast.success('Livraison enregistrée — vente créée')
      onClose()
    },
    onError: (e: Error) => toast.error(e.message ?? 'Erreur'),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmer la livraison</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-muted-foreground text-sm">
            {livraison.abonnement.nom} — {livraison.abonnement.client.raisonSociale}
            <br />
            {new Date(livraison.date).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
          </p>
          <div>
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
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Traitement…' : 'Marquer comme livré'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Abonnement card ──────────────────────────────────────────────────────────

function AbonnementCard({
  abonnement,
  onEdit,
  onPlan,
}: {
  abonnement: Abonnement
  onEdit: () => void
  onPlan: () => void
}) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)

  const toggleActif = useMutation({
    mutationFn: () =>
      api.patch(`/abonnements/${abonnement.id}/actif`, { actif: !abonnement.actif }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['abonnements'] }),
    onError: () => toast.error('Erreur'),
  })

  return (
    <div
      className={`border-border bg-card rounded-xl border shadow-sm ${!abonnement.actif ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-primary/10 shrink-0 rounded-lg p-2">
            <Package className="text-primary h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{abonnement.nom}</p>
            <p className="text-muted-foreground truncate text-sm">
              {abonnement.client.raisonSociale} · {FREQ_LABELS[abonnement.frequence]}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={abonnement.actif ? 'default' : 'secondary'}>
            {abonnement.actif ? 'Actif' : 'Inactif'}
          </Badge>
          <span className="text-muted-foreground text-xs">{abonnement._count.livraisons} liv.</span>
          <Button size="sm" variant="ghost" onClick={() => toggleActif.mutate()}>
            {abonnement.actif ? 'Désactiver' : 'Activer'}
          </Button>
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={onPlan}
            disabled={!abonnement.actif}
          >
            <Calendar className="h-3.5 w-3.5" />
            Planifier
          </Button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-border border-t px-4 pt-3 pb-4">
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Contenu
          </p>
          <div className="space-y-1">
            {abonnement.lignes.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <span>
                  {l.variante.produit.nom} — {varianteLabel(l.variante)}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  × {Number(l.qte).toLocaleString('fr-FR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Calendrier livraisons ────────────────────────────────────────────────────

function CalendrierLivraisons() {
  const [livrerDialog, setLivrerDialog] = useState<Livraison | null>(null)
  const qc = useQueryClient()

  const { data: livraisons = [], isLoading } = useQuery<Livraison[]>({
    queryKey: ['livraisons-calendrier'],
    queryFn: () => api.get('/abonnements/livraisons/calendrier'),
  })

  const annuler = useMutation({
    mutationFn: (id: string) => api.post(`/abonnements/livraisons/${id}/annuler`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['livraisons-calendrier'] })
      toast.success('Livraison annulée')
    },
    onError: () => toast.error('Erreur'),
  })

  if (isLoading)
    return (
      <div className="border-border bg-card flex items-center justify-center rounded-xl border py-10">
        <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    )

  if (livraisons.length === 0)
    return (
      <div className="border-border bg-card flex flex-col items-center justify-center rounded-xl border py-10">
        <Truck className="text-muted-foreground/40 mb-2 h-7 w-7" />
        <p className="text-muted-foreground text-sm">
          Aucune livraison planifiée dans les 60 prochains jours
        </p>
      </div>
    )

  return (
    <>
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border bg-muted/40 border-b">
              <th className="text-muted-foreground px-4 py-3 text-left font-medium">Date</th>
              <th className="text-muted-foreground px-4 py-3 text-left font-medium">Abonnement</th>
              <th className="text-muted-foreground px-4 py-3 text-left font-medium">Client</th>
              <th className="w-36 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {livraisons.map((l) => (
              <tr key={l.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 tabular-nums">
                  {new Date(l.date).toLocaleDateString('fr-FR', { dateStyle: 'medium' })}
                </td>
                <td className="px-4 py-3 font-medium">{l.abonnement.nom}</td>
                <td className="text-muted-foreground px-4 py-3">
                  {l.abonnement.client.raisonSociale}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      onClick={() => setLivrerDialog(l)}
                    >
                      <Truck className="h-3 w-3" />
                      Livrer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-red-500 hover:text-red-600"
                      onClick={() => annuler.mutate(l.id)}
                    >
                      Annuler
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {livrerDialog && (
        <LivrerDialog livraison={livrerDialog} onClose={() => setLivrerDialog(null)} />
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AbonnementsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Abonnement | null>(null)
  const [planTarget, setPlanTarget] = useState<Abonnement | null>(null)
  const [tab, setTab] = useState<'abonnements' | 'calendrier'>('abonnements')

  const { data: abonnements = [], isLoading } = useQuery<Abonnement[]>({
    queryKey: ['abonnements'],
    queryFn: () => api.get('/abonnements'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Abonnements AMAP</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Paniers récurrents et livraisons clients
          </p>
        </div>
        <Button className="shrink-0 gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Nouvel abonnement
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-border flex gap-1 border-b">
        {(['abonnements', 'calendrier'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            }`}
          >
            {t === 'calendrier' ? 'Livraisons à venir' : 'Abonnements'}
          </button>
        ))}
      </div>

      {tab === 'abonnements' && (
        <>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          ) : abonnements.length === 0 ? (
            <div className="border-border bg-card flex flex-col items-center justify-center rounded-xl border py-16">
              <Package className="text-muted-foreground/40 mb-3 h-8 w-8" />
              <p className="text-muted-foreground text-sm">Aucun abonnement créé</p>
              <Button variant="outline" className="mt-4 gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Créer un abonnement
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {abonnements.map((a) => (
                <AbonnementCard
                  key={a.id}
                  abonnement={a}
                  onEdit={() => setEditTarget(a)}
                  onPlan={() => setPlanTarget(a)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'calendrier' && <CalendrierLivraisons />}

      {createOpen && <AbonnementDialog onClose={() => setCreateOpen(false)} />}
      {editTarget && (
        <AbonnementDialog abonnement={editTarget} onClose={() => setEditTarget(null)} />
      )}
      {planTarget && (
        <PlanLivraisonDialog abonnement={planTarget} onClose={() => setPlanTarget(null)} />
      )}
    </div>
  )
}
