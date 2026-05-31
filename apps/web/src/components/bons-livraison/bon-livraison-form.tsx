'use client'

import { useState, useTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Save, Plus, Trash2, Search, Package, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { roundFiscal } from '@/lib/tva'
import { api } from '@/lib/api'
import type { ClientComplet } from '@/types/client'
import type { ProduitPOS, ProduitPOSVariante } from '@/types/pos'

const EMBALLAGE: Record<string, string> = {
  VRAC: '',
  BARQUETTE: 'barquette',
  FILET: 'filet',
  SAC: 'sac',
  CAISSE: 'caisse',
  PLATEAU: 'plateau',
}

type LigneForm = {
  varianteProduitId: string
  designation: string
  qte: string
  unite: string
  prixUnitaireHT: string
  remise: string
}

type FormValues = {
  clientId: string
  mode: 'manuel' | 'vente'
  venteTicket: string
  lignes: LigneForm[]
  remiseCommerciale: string
  dateLivraison: string
  notes: string
  statut: 'BROUILLON' | 'EMIS'
}

interface VentePreview {
  id: string
  numeroTicket: string
  totalTTC: number | string
  lignes: Array<{
    designation?: string
    qte: number | string
    prixUnitaireHT: number | string
    tauxTVA: number | string
    montantHT: number | string
    remise: number | string
    variante?: { produit: { nom: string }; poids?: number | string | null; emballage: string }
  }>
}

interface BonLivraisonFormProps {
  clients: ClientComplet[]
}

function varianteLabel(v: ProduitPOSVariante): string {
  const parts: string[] = []
  if (v.poids) parts.push(`${Number(v.poids)} kg`)
  const emb = EMBALLAGE[v.emballage]
  if (emb) parts.push(emb)
  return parts.join(' ') || 'Unité'
}

function varianteUnite(v: ProduitPOSVariante): string {
  if (v.poids) return 'kg'
  const emb = EMBALLAGE[v.emballage]
  return emb || 'unité'
}

// ─── Catalogue picker ────────────────────────────────────────────────────────

interface CataloguePickerProps {
  onPick: (ligne: LigneForm) => void
  onClose: () => void
}

function CataloguePicker({ onPick, onClose }: CataloguePickerProps) {
  const [q, setQ] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: produits = [] } = useQuery<ProduitPOS[]>({
    queryKey: ['produits', 'pos'],
    queryFn: () =>
      api.get('/produits?actif=true&withVariantes=true').then((raw: unknown) =>
        (raw as ProduitPOS[]).map((p) => ({
          ...p,
          variantes: (p.variantes as unknown as Array<ProduitPOSVariante & { tauxTVA: { taux: number } | number; actif?: boolean }>)
            .filter((v) => v.actif !== false)
            .map((v) => ({
              ...v,
              prixHT: Number(v.prixHT),
              prixTTC: Number(v.prixTTC),
              tauxTVA: typeof v.tauxTVA === 'object' ? Number((v.tauxTVA as { taux: number }).taux) : Number(v.tauxTVA),
            })),
        }))
      ),
    staleTime: 60_000,
  })

  const filtered = produits.filter((p) => !q || p.nom.toLowerCase().includes(q.toLowerCase()))

  function pick(produit: ProduitPOS, variante: ProduitPOSVariante) {
    const label = varianteLabel(variante)
    const designation = label && label !== 'Unité' ? `${produit.nom} — ${label}` : produit.nom
    onPick({
      varianteProduitId: variante.id,
      designation,
      qte: '1',
      unite: varianteUnite(variante),
      prixUnitaireHT: variante.prixHT.toFixed(4),
      remise: '0',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex h-[70vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <span className="font-semibold text-zinc-800">Choisir un produit</span>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 py-2">
          <Input
            autoFocus
            placeholder="Rechercher un produit…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-zinc-400">Aucun produit</p>
          )}
          {filtered.map((p) => (
            <div key={p.id} className="border-b border-zinc-50 last:border-0">
              {p.variantes.length === 1 ? (
                <button
                  type="button"
                  onClick={() => pick(p, p.variantes[0])}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-zinc-50"
                >
                  <span className="text-sm font-medium text-zinc-800">{p.nom}</span>
                  <span className="text-xs text-zinc-400">
                    {p.variantes[0].prixHT.toFixed(2).replace('.', ',')} € HT
                  </span>
                </button>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-zinc-50"
                  >
                    <span className="text-sm font-medium text-zinc-800">{p.nom}</span>
                    <span className="text-xs text-zinc-400">{p.variantes.length} variantes</span>
                  </button>
                  {expandedId === p.id && (
                    <div className="bg-zinc-50 pb-1">
                      {p.variantes.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => pick(p, v)}
                          className="flex w-full items-center justify-between px-6 py-2 text-left text-sm hover:bg-zinc-100"
                        >
                          <span className="text-zinc-700">{varianteLabel(v)}</span>
                          <span className="text-xs text-zinc-400">
                            {v.prixHT.toFixed(2).replace('.', ',')} € HT
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function BonLivraisonForm({ clients }: BonLivraisonFormProps) {
  const navigate = useNavigate()
  const [isPending, startTransition] = useTransition()
  const [ventePreview, setVentePreview] = useState<VentePreview | null>(null)
  const [searching, setSearching] = useState(false)
  const [showCatalogue, setShowCatalogue] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      clientId: '',
      mode: 'manuel',
      venteTicket: '',
      lignes: [
        {
          varianteProduitId: '',
          designation: '',
          qte: '1',
          unite: '',
          prixUnitaireHT: '',
          remise: '0',
        },
      ],
      remiseCommerciale: '0',
      dateLivraison: '',
      notes: '',
      statut: 'BROUILLON',
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lignes' })
  const mode = watch('mode')
  const lignes = watch('lignes')
  const remiseCommercialeStr = watch('remiseCommerciale')
  const remisePct = parseFloat(remiseCommercialeStr ?? '0') || 0
  const remiseFactor = 1 - remisePct / 100

  const lignesComputed = lignes.map((l) => {
    const qte = parseFloat(l.qte) || 0
    const puHT = parseFloat(l.prixUnitaireHT) || 0
    const remise = parseFloat(l.remise) || 0
    const montantHT = roundFiscal(puHT * qte * (1 - remise / 100))
    return { montantHT }
  })

  const totalHTBrut = roundFiscal(lignesComputed.reduce((s, l) => s + l.montantHT, 0))
  const totalHT = roundFiscal(totalHTBrut * remiseFactor)

  async function searchVente() {
    const ticket = watch('venteTicket')?.trim()
    if (!ticket) return
    setSearching(true)
    try {
      const res = await fetch(`/api/ventes?q=${encodeURIComponent(ticket)}`)
      const data = await res.json()
      const ventes = Array.isArray(data) ? data : []
      const found = ventes.find((v: { numeroTicket: string }) => v.numeroTicket === ticket)
      if (!found) {
        const res2 = await fetch(`/api/ventes/${ticket}`)
        if (res2.ok) setVentePreview(await res2.json())
        else toast.error('Vente introuvable')
      } else {
        const res2 = await fetch(`/api/ventes/${found.id}`)
        setVentePreview(await res2.json())
      }
    } catch {
      toast.error('Erreur de recherche')
    } finally {
      setSearching(false)
    }
  }

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        let lignesPayload: Array<{
          varianteProduitId?: string | null
          designation: string
          qte: number
          unite?: string | null
          prixUnitaireHT: number
          remise: number
        }>

        if (values.mode === 'vente') {
          if (!ventePreview) {
            toast.error('Sélectionnez une vente')
            return
          }
          lignesPayload = ventePreview.lignes.map((l) => {
            const v = l.variante
            const designation = v
              ? [
                  v.produit.nom,
                  v.poids ? `${Number(v.poids)} kg` : '',
                  EMBALLAGE[v.emballage] ?? '',
                ]
                  .filter(Boolean)
                  .join(' ')
              : (l.designation ?? '?')
            const unite = v?.poids ? 'kg' : EMBALLAGE[v?.emballage ?? ''] || undefined
            return {
              designation,
              qte: Number(l.qte),
              unite: unite ?? null,
              prixUnitaireHT: Number(l.prixUnitaireHT),
              remise: Number(l.remise) || 0,
            }
          })
        } else {
          lignesPayload = values.lignes.map((l) => ({
            varianteProduitId: l.varianteProduitId || null,
            designation: l.designation,
            qte: parseFloat(l.qte),
            unite: l.unite || null,
            prixUnitaireHT: parseFloat(l.prixUnitaireHT),
            remise: parseFloat(l.remise) || 0,
          }))
        }

        const payload = {
          clientId: values.clientId,
          venteId: values.mode === 'vente' && ventePreview ? ventePreview.id : null,
          lignes: lignesPayload,
          remiseCommerciale: parseFloat(values.remiseCommerciale) || 0,
          dateLivraison: values.dateLivraison ? new Date(values.dateLivraison).toISOString() : null,
          notes: values.notes || null,
          statut: values.statut,
        }

        const res = await fetch('/api/bons-livraison', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error((err as { error?: string }).error ?? 'Erreur serveur')
          return
        }

        const { id } = await res.json()
        toast.success('Bon de livraison créé')
        navigate(`/dashboard/bons-livraison/${id}`)
      } catch {
        toast.error('Erreur réseau')
      }
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {showCatalogue && (
        <CataloguePicker
          onPick={(ligne) => append(ligne)}
          onClose={() => setShowCatalogue(false)}
        />
      )}

      <div className="flex items-center gap-3">
        <Link
          to="/dashboard/bons-livraison"
          className={buttonVariants({ variant: 'ghost', size: 'icon' })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-zinc-900">Nouveau bon de livraison</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Informations générales */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-zinc-700">Informations générales</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <Select onValueChange={(v: string | null) => setValue('clientId', v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.raisonSociale}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.clientId && <p className="text-xs text-red-500">Client requis</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Statut initial</Label>
              <Select
                defaultValue="BROUILLON"
                onValueChange={(v) =>
                  setValue('statut', (v ?? 'BROUILLON') as 'BROUILLON' | 'EMIS')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BROUILLON">Brouillon</SelectItem>
                  <SelectItem value="EMIS">Émettre directement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateLivraison">Date de livraison</Label>
              <Input id="dateLivraison" type="date" {...register('dateLivraison')} />
            </div>
          </div>
        </div>

        {/* Source lignes */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex gap-2">
            {(['manuel', 'vente'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setValue('mode', m)}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  mode === m
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                )}
              >
                {m === 'manuel' ? 'Lignes manuelles' : 'Depuis une vente caisse'}
              </button>
            ))}
          </div>

          {mode === 'vente' ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="N° ticket (ex: VTE-20260514-0001) ou ID vente"
                  {...register('venteTicket')}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={searchVente}
                  disabled={searching}
                  className="gap-1.5"
                >
                  <Search className="h-4 w-4" />
                  {searching ? 'Recherche…' : 'Rechercher'}
                </Button>
              </div>
              {ventePreview && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-green-800">
                    Vente {ventePreview.numeroTicket} —{' '}
                    {Number(ventePreview.totalTTC).toFixed(2).replace('.', ',')} € TTC
                  </p>
                  {ventePreview.lignes?.map((l, i) => {
                    const v = l.variante
                    const name = v
                      ? [
                          v.produit.nom,
                          v.poids ? `${Number(v.poids)} kg` : '',
                          EMBALLAGE[v.emballage] ?? '',
                        ]
                          .filter(Boolean)
                          .join(' ')
                      : (l.designation ?? '?')
                    return (
                      <p key={i} className="text-xs text-green-700">
                        {name} × {Number(l.qte)}
                      </p>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Column headers */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-zinc-500">
                <span className="col-span-4">Désignation</span>
                <span className="col-span-1 text-center">Qté</span>
                <span className="col-span-2">Unité</span>
                <span className="col-span-2 text-right">PU HT</span>
                <span className="col-span-1 text-center">Rem.</span>
                <span className="col-span-1 text-right">HT</span>
                <span className="col-span-1" />
              </div>

              {fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-12 items-center gap-2">
                  <div className="relative col-span-4">
                    <Input
                      {...register(`lignes.${idx}.designation`)}
                      placeholder="Désignation"
                      className="h-8 text-sm"
                    />
                    <input type="hidden" {...register(`lignes.${idx}.varianteProduitId`)} />
                  </div>
                  <Input
                    {...register(`lignes.${idx}.qte`)}
                    type="number"
                    step="0.001"
                    min="0.001"
                    className="col-span-1 h-8 text-center text-sm"
                  />
                  <Input
                    {...register(`lignes.${idx}.unite`)}
                    placeholder="kg"
                    className="col-span-2 h-8 text-sm"
                  />
                  <Input
                    {...register(`lignes.${idx}.prixUnitaireHT`)}
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="0.00"
                    className="col-span-2 h-8 text-right text-sm"
                  />
                  <Input
                    {...register(`lignes.${idx}.remise`)}
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0"
                    className="col-span-1 h-8 text-center text-sm"
                  />
                  <div className="col-span-1 text-right text-sm font-medium text-zinc-700">
                    {lignesComputed[idx]?.montantHT.toFixed(2).replace('.', ',')}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    disabled={fields.length === 1}
                    className="col-span-1 flex h-7 w-7 items-center justify-center rounded text-zinc-300 hover:text-red-500 disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    append({
                      varianteProduitId: '',
                      designation: '',
                      qte: '1',
                      unite: '',
                      prixUnitaireHT: '',
                      remise: '0',
                    })
                  }
                  className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter une ligne
                </button>
                <button
                  type="button"
                  onClick={() => setShowCatalogue(true)}
                  className="flex items-center gap-1 text-sm text-green-700 hover:text-green-900"
                >
                  <Package className="h-3.5 w-3.5" />
                  Depuis le catalogue
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <Label htmlFor="remiseCommerciale" className="whitespace-nowrap">
                    Remise commerciale (%)
                  </Label>
                  <Input
                    id="remiseCommerciale"
                    {...register('remiseCommerciale')}
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0"
                    className="h-8 w-20 text-center text-sm"
                  />
                </div>
                <div className="text-sm font-bold text-zinc-900">
                  {remisePct > 0 && (
                    <span className="mr-3 font-normal text-zinc-400 line-through">
                      {totalHTBrut.toFixed(2).replace('.', ',')} €
                    </span>
                  )}
                  Total HT : {totalHT.toFixed(2).replace('.', ',')} €
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register('notes')} rows={2} className="resize-none" />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link to="/dashboard/bons-livraison" className={buttonVariants({ variant: 'ghost' })}>
            Annuler
          </Link>
          <Button type="submit" disabled={isPending} className="gap-1.5">
            <Save className="h-4 w-4" />
            {isPending ? 'Enregistrement…' : 'Créer le BL'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}
