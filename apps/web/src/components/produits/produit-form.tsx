'use client'

import { useState, useTransition, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useForm,
  useFieldArray,
  type Resolver,
  type UseFormSetValue,
  type UseFormWatch,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { TYPE_EMBALLAGE } from '@/lib/validations/produit'
import type { ProduitComplet } from '@/types/produits'
import type { Categorie } from '@souslepommier/database'

type TauxTVAItem = { id: string; libelle: string; taux: number; defaut: boolean; actif: boolean }
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DeactivateDialog } from './deactivate-dialog'
import { LabelPrintModal } from './label-print-modal'
import { ArrowLeft, Plus, Trash2, Save, ImagePlus, X, Tag } from 'lucide-react'
import { Link } from 'react-router-dom'

// ─── Schéma formulaire ────────────────────────────────────────────────────────

const varianteRowSchema = z.object({
  id: z.string().optional(),
  poids: z.string().optional(),
  emballage: z.enum(TYPE_EMBALLAGE),
  prixHT: z.string().min(1, 'Requis'),
  tauxTVAId: z.string().min(1, 'Requis'),
  sku: z.string().optional(),
  venteAuPoids: z.boolean().default(false),
  actif: z.boolean().default(true),
})

const formSchema = z.object({
  nom: z.string().min(1, 'Nom requis').max(100),
  categorieId: z.string().optional(),
  description: z.string().max(500).optional(),
  actif: z.boolean().default(true),
  saisonDebutMois: z.number().int().min(1).max(12).nullable().optional(),
  saisonDebutJour: z.number().int().min(1).max(31).nullable().optional(),
  saisonFinMois: z.number().int().min(1).max(12).nullable().optional(),
  saisonFinJour: z.number().int().min(1).max(31).nullable().optional(),
  variantes: z.array(varianteRowSchema),
})

type FormValues = z.infer<typeof formSchema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProduitFormProps {
  produit?: ProduitComplet | null
  categories: Categorie[]
}

const EMBALLAGE_LABELS: Record<string, string> = {
  VRAC: 'Vrac',
  BARQUETTE: 'Barquette',
  FILET: 'Filet',
  SAC: 'Sac',
  CAISSE: 'Caisse',
  PLATEAU: 'Plateau',
}

const MOIS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
]

function SaisonSection({
  watch,
  setValue,
}: {
  watch: UseFormWatch<FormValues>
  setValue: UseFormSetValue<FormValues>
}) {
  const debutMois = watch('saisonDebutMois') ?? null
  const debutJour = watch('saisonDebutJour') ?? null
  const finMois = watch('saisonFinMois') ?? null
  const finJour = watch('saisonFinJour') ?? null

  function clearSaison() {
    setValue('saisonDebutMois', null)
    setValue('saisonDebutJour', null)
    setValue('saisonFinMois', null)
    setValue('saisonFinJour', null)
  }

  function enableSaison() {
    setValue('saisonDebutMois', 1)
    setValue('saisonDebutJour', 1)
    setValue('saisonFinMois', 12)
    setValue('saisonFinJour', 31)
  }

  const hasSaison = debutMois !== null && debutMois !== undefined

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-zinc-800">Disponibilité saisonnière</h2>
        {hasSaison ? (
          <button
            type="button"
            onClick={clearSaison}
            className="text-xs text-red-500 hover:text-red-600"
          >
            Supprimer la saisonnalité
          </button>
        ) : (
          <button
            type="button"
            onClick={enableSaison}
            className="text-xs font-medium text-green-600 hover:text-green-700"
          >
            + Définir une saison
          </button>
        )}
      </div>

      {hasSaison ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs tracking-wide text-zinc-500 uppercase">Début de saison</Label>
            <div className="flex gap-2">
              <Select
                value={debutJour != null ? String(debutJour) : ''}
                onValueChange={(v) => setValue('saisonDebutJour', v ? parseInt(v) : null)}
              >
                <SelectTrigger className="w-20">
                  <SelectValue placeholder="Jour" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={debutMois != null ? String(debutMois) : ''}
                onValueChange={(v) => setValue('saisonDebutMois', v ? parseInt(v) : null)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Mois" />
                </SelectTrigger>
                <SelectContent>
                  {MOIS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs tracking-wide text-zinc-500 uppercase">Fin de saison</Label>
            <div className="flex gap-2">
              <Select
                value={finJour != null ? String(finJour) : ''}
                onValueChange={(v) => setValue('saisonFinJour', v ? parseInt(v) : null)}
              >
                <SelectTrigger className="w-20">
                  <SelectValue placeholder="Jour" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={finMois != null ? String(finMois) : ''}
                onValueChange={(v) => setValue('saisonFinMois', v ? parseInt(v) : null)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Mois" />
                </SelectTrigger>
                <SelectContent>
                  {MOIS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {debutMois && debutJour && finMois && finJour && (
            <p className="col-span-2 text-xs text-zinc-400">
              Disponible du{' '}
              <strong>
                {debutJour} {MOIS[debutMois - 1]}
              </strong>{' '}
              au{' '}
              <strong>
                {finJour} {MOIS[finMois - 1]}
              </strong>
              {debutMois > finMois || (debutMois === finMois && debutJour > finJour)
                ? " (chevauchement d'année)"
                : ''}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-zinc-400">Aucune restriction — disponible toute l&apos;année.</p>
      )}
    </div>
  )
}

type Palier = { id: string; qteMin: number; remisePct: number }

function PaliersVariante({
  varianteId,
  varianteLabel,
  venteAuPoids,
}: {
  varianteId: string
  varianteLabel: string
  venteAuPoids: boolean
}) {
  const [paliers, setPaliers] = useState<Palier[]>([])
  const [loading, setLoading] = useState(false)
  const [qteMin, setQteMin] = useState('')
  const [remisePct, setRemisePct] = useState('')
  const unit = venteAuPoids ? 'kg' : 'pcs'

  useEffect(() => {
    fetch(`/api/variantes/${varianteId}/paliers`)
      .then((r) => r.json())
      .then((data: Palier[]) => setPaliers(data))
      .catch(() => {})
  }, [varianteId])

  async function savePaliers(next: Omit<Palier, 'id'>[]) {
    setLoading(true)
    const res = await fetch(`/api/variantes/${varianteId}/paliers`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    })
    if (res.ok) {
      const data: Palier[] = await res.json()
      setPaliers(data)
    }
    setLoading(false)
  }

  function addPalier() {
    const qMin = parseFloat(qteMin.replace(',', '.'))
    const pct = parseFloat(remisePct.replace(',', '.'))
    if (isNaN(qMin) || qMin <= 0 || isNaN(pct) || pct <= 0 || pct > 100) return
    const next = [
      ...paliers.map((p) => ({ qteMin: p.qteMin, remisePct: p.remisePct })),
      { qteMin: qMin, remisePct: pct },
    ].sort((a, b) => a.qteMin - b.qteMin)
    void savePaliers(next)
    setQteMin('')
    setRemisePct('')
  }

  function removePalier(id: string) {
    const next = paliers
      .filter((p) => p.id !== id)
      .map((p) => ({ qteMin: p.qteMin, remisePct: p.remisePct }))
    void savePaliers(next)
  }

  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
      <p className="mb-2 text-xs font-semibold text-zinc-600">{varianteLabel}</p>
      {paliers.length > 0 && (
        <div className="mb-2 space-y-1">
          {paliers.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded bg-white px-3 py-1.5 text-xs shadow-sm"
            >
              <span className="text-zinc-600">
                ≥{' '}
                <strong>
                  {venteAuPoids ? p.qteMin.toFixed(3) : p.qteMin} {unit}
                </strong>
                {' → '}
                <strong className="text-green-700">{p.remisePct}%</strong> de remise
              </span>
              <button
                type="button"
                onClick={() => removePalier(p.id)}
                disabled={loading}
                className="ml-3 text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          step={venteAuPoids ? '0.001' : '1'}
          value={qteMin}
          onChange={(e) => setQteMin(e.target.value)}
          placeholder={`Qté min (${unit})`}
          className="h-8 w-36 text-xs"
        />
        <Input
          type="number"
          min="0.01"
          max="100"
          step="0.1"
          value={remisePct}
          onChange={(e) => setRemisePct(e.target.value)}
          placeholder="Remise %"
          className="h-8 w-28 text-xs"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addPalier}
          disabled={loading}
          className="h-8 text-xs"
        >
          <Plus className="mr-1 h-3 w-3" />
          Ajouter
        </Button>
      </div>
    </div>
  )
}

function PaliersSection({
  variantesAvecId,
}: {
  variantesAvecId: Array<{ id: string; label: string; venteAuPoids: boolean }>
}) {
  if (variantesAvecId.length === 0) return null
  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="font-semibold text-zinc-800">Paliers de remise</h2>
      <p className="text-xs text-zinc-400">
        Remise automatique dans le POS quand la quantité atteint le seuil.
      </p>
      <div className="space-y-3">
        {variantesAvecId.map((v) => (
          <PaliersVariante
            key={v.id}
            varianteId={v.id}
            varianteLabel={v.label}
            venteAuPoids={v.venteAuPoids}
          />
        ))}
      </div>
    </div>
  )
}

export function ProduitForm({ produit, categories }: ProduitFormProps) {
  const navigate = useNavigate()
  const [isPending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)

  const { data: tauxTVAList = [] } = useQuery<TauxTVAItem[]>({
    queryKey: ['taux-tva'],
    queryFn: () => api.get<TauxTVAItem[]>('/taux-tva'),
    staleTime: 60_000,
  })

  function getTaux(tauxTVAId: string) {
    return tauxTVAList.find((t) => t.id === tauxTVAId)?.taux ?? 0
  }
  const [showLabels, setShowLabels] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(produit?.image ?? null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [varianteDeactivate, setVarianteDeactivate] = useState<{
    index: number
    id?: string
  } | null>(null)
  const [varianteDeleteIndex, setVarianteDeleteIndex] = useState<number | null>(null)

  const isEditing = !!produit

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      nom: produit?.nom ?? '',
      categorieId: produit?.categorieId ?? undefined,
      description: produit?.description ?? '',
      actif: produit?.actif ?? true,
      saisonDebutMois: produit?.saisonDebutMois ?? null,
      saisonDebutJour: produit?.saisonDebutJour ?? null,
      saisonFinMois: produit?.saisonFinMois ?? null,
      saisonFinJour: produit?.saisonFinJour ?? null,
      variantes:
        produit?.variantes.map((v) => ({
          id: v.id,
          poids: v.poids != null ? String(v.poids) : '',
          emballage: v.emballage as (typeof TYPE_EMBALLAGE)[number],
          prixHT: String(v.prixHT),
          tauxTVAId: v.tauxTVA.id,
          sku: v.sku ?? '',
          venteAuPoids: (v as typeof v & { venteAuPoids?: boolean }).venteAuPoids ?? false,
          actif: v.actif,
        })) ?? [],
    },
  })

  const { fields, append, remove, update } = useFieldArray({ control, name: 'variantes' })
  const watchedVariantes = watch('variantes')
  const watchedActif = watch('actif')

  function computeTTC(index: number) {
    const row = watchedVariantes?.[index]
    if (!row) return '—'
    const ht = parseFloat(row.prixHT)
    const tva = getTaux(row.tauxTVAId)
    if (isNaN(ht)) return '—'
    return (ht * (1 + tva / 100)).toFixed(2).replace('.', ',') + ' €'
  }

  function addVariante() {
    const defaultTVA =
      tauxTVAList.find((t) => t.defaut && t.actif) ??
      tauxTVAList.find((t) => t.actif) ??
      tauxTVAList[0]
    append({
      poids: '',
      emballage: 'VRAC',
      prixHT: '',
      tauxTVAId: defaultTVA?.id ?? '',
      sku: '',
      venteAuPoids: false,
      actif: true,
    })
  }

  function handleVarianteToggle(index: number, checked: boolean) {
    const field = fields[index]
    if (!checked) {
      setVarianteDeactivate({ index, id: field.id })
      return
    }
    update(index, { ...watchedVariantes[index], actif: true })
    // Si variante existante en BDD → call API
    if (field.id && produit) {
      void patchVarianteStatut(field.id, true)
    }
  }

  async function uploadImageForProduit(id: string, file: File) {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/produits/${id}/image`, { method: 'POST', body: fd })
    if (!res.ok) {
      toast.error('Erreur upload image')
      return null
    }
    const data = await res.json()
    return data.image as string
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Format non supporté. JPEG, PNG ou WebP requis.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 2 Mo)')
      return
    }
    setImageFile(file)
    setImageUrl(URL.createObjectURL(file))
    // If editing, upload immediately
    if (produit?.id) {
      setUploadingImage(true)
      const url = await uploadImageForProduit(produit.id, file)
      setUploadingImage(false)
      if (url) {
        setImageUrl(url)
        setImageFile(null)
        toast.success('Image mise à jour')
      }
    }
  }

  async function handleDeleteImage() {
    if (produit?.id) {
      await fetch(`/api/produits/${produit.id}/image`, { method: 'DELETE' })
    }
    setImageUrl(null)
    setImageFile(null)
  }

  async function patchVarianteStatut(varianteId: string, actif: boolean) {
    await fetch(`/api/variantes/${varianteId}/statut`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif }),
    })
  }

  async function onSubmit(data: FormValues) {
    setSaving(true)
    try {
      // 1. Créer ou mettre à jour le produit
      const produitPayload = {
        nom: data.nom,
        categorieId: data.categorieId || null,
        description: data.description || null,
        image: null,
        actif: data.actif,
        saisonDebutMois: data.saisonDebutMois ?? null,
        saisonDebutJour: data.saisonDebutJour ?? null,
        saisonFinMois: data.saisonFinMois ?? null,
        saisonFinJour: data.saisonFinJour ?? null,
      }

      let produitId = produit?.id
      if (isEditing && produitId) {
        const res = await fetch(`/api/produits/${produitId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(produitPayload),
        })
        if (!res.ok) {
          toast.error('Erreur sauvegarde produit')
          return
        }
      } else {
        const res = await fetch('/api/produits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(produitPayload),
        })
        if (!res.ok) {
          toast.error('Erreur création produit')
          return
        }
        const created = await res.json()
        produitId = created.id
        // Upload image for new product
        if (imageFile && produitId) {
          await uploadImageForProduit(produitId, imageFile)
        }
      }

      // 2. Sauvegarder les variantes
      for (const variante of data.variantes) {
        const poidsNum = variante.poids ? parseFloat(variante.poids) : null
        const variantePayload = {
          poids: isNaN(poidsNum as number) ? null : poidsNum,
          emballage: variante.emballage,
          prixHT: parseFloat(variante.prixHT),
          tauxTVAId: variante.tauxTVAId,
          sku: variante.sku || null,
          venteAuPoids: variante.venteAuPoids ?? false,
          actif: variante.actif,
        }

        if (variante.id && isEditing) {
          await fetch(`/api/variantes/${variante.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(variantePayload),
          })
        } else {
          await fetch('/api/variantes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...variantePayload, produitId }),
          })
        }
      }

      toast.success(isEditing ? 'Produit mis à jour' : 'Produit créé')
      startTransition(() => navigate('/dashboard/produits'))
      window.location.reload()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  const fieldError = (msg?: string) =>
    msg ? <p className="mt-1 text-xs text-red-500">{msg}</p> : null

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/produits"
            className={buttonVariants({ variant: 'ghost', size: 'icon' })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">
              {isEditing ? `Modifier ${produit.nom}` : 'Nouveau produit'}
            </h1>
            <p className="text-sm text-zinc-500">
              {isEditing
                ? `${produit.variantes.length} variante(s)`
                : 'Renseignez le produit et ses variantes'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing && produit && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowLabels(true)}
              className="gap-2"
            >
              <Tag className="h-4 w-4" />
              Étiquettes
            </Button>
          )}
          <Button type="submit" disabled={saving || isPending} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      {/* Informations produit */}
      <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-zinc-800">Informations</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="nom">
              Nom du produit <span className="text-red-500">*</span>
            </Label>
            <Input id="nom" {...register('nom')} placeholder="Ex: Pomme Golden" />
            {fieldError(errors.nom?.message)}
          </div>

          <div>
            <Label htmlFor="categorieId">Catégorie</Label>
            <Select
              defaultValue={produit?.categorieId ?? ''}
              onValueChange={(v) => setValue('categorieId', v || undefined)}
            >
              <SelectTrigger id="categorieId">
                <span className="flex-1 text-left text-sm">
                  {watch('categorieId')
                    ? (categories.find((c) => c.id === watch('categorieId'))?.nom ??
                      'Sans catégorie')
                    : 'Sélectionner…'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sans catégorie</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 pt-6">
            <Switch checked={watchedActif} onCheckedChange={(v) => setValue('actif', v)} />
            <Label>
              {watchedActif ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Actif</Badge>
              ) : (
                <Badge variant="secondary">Inactif</Badge>
              )}
            </Label>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Variété, origine, caractéristiques…"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Photo produit */}
      <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-zinc-800">Photo</h2>
        <div className="flex items-center gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
            {imageUrl ? (
              <img src={imageUrl} alt="Aperçu" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-8 w-8 text-zinc-300" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleImageChange}
                disabled={uploadingImage}
              />
              <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:border-zinc-300 hover:bg-zinc-50">
                <ImagePlus className="h-4 w-4" />
                {uploadingImage ? 'Envoi…' : imageUrl ? 'Changer' : 'Ajouter une photo'}
              </span>
            </label>
            {imageUrl && (
              <button
                type="button"
                onClick={handleDeleteImage}
                className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600"
              >
                <X className="h-3 w-3" />
                Supprimer
              </button>
            )}
            <p className="text-xs text-zinc-400">JPEG, PNG ou WebP · max 2 Mo</p>
          </div>
        </div>
      </div>

      {/* Disponibilité saisonnière */}
      <SaisonSection watch={watch} setValue={setValue} />

      {/* Variantes */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="font-semibold text-zinc-800">
            Variantes
            <span className="ml-2 text-sm font-normal text-zinc-400">({fields.length})</span>
          </h2>
          <Button type="button" variant="outline" size="sm" onClick={addVariante} className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter une variante
          </Button>
        </div>

        {fields.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-zinc-400">
            <p>Aucune variante</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addVariante}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Ajouter la première variante
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50">
                  <TableHead className="w-24">Poids (kg)</TableHead>
                  <TableHead className="w-36">Emballage</TableHead>
                  <TableHead className="w-28">Prix HT (€)</TableHead>
                  <TableHead className="w-28">TVA (%)</TableHead>
                  <TableHead className="w-28">Prix TTC</TableHead>
                  <TableHead className="w-36">SKU</TableHead>
                  <TableHead className="w-20 text-center">Pesée</TableHead>
                  <TableHead className="w-16 text-center">Actif</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow
                    key={field.id}
                    className={!watchedVariantes[index]?.actif ? 'opacity-50' : ''}
                  >
                    <TableCell>
                      <Input
                        {...register(`variantes.${index}.poids`)}
                        placeholder="1"
                        type="number"
                        min="0"
                        step="0.001"
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        defaultValue={field.emballage ?? 'VRAC'}
                        onValueChange={(v) =>
                          setValue(
                            `variantes.${index}.emballage`,
                            (v ?? 'VRAC') as (typeof TYPE_EMBALLAGE)[number]
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPE_EMBALLAGE.map((e) => (
                            <SelectItem key={e} value={e}>
                              {EMBALLAGE_LABELS[e]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        {...register(`variantes.${index}.prixHT`)}
                        placeholder="1.14"
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full"
                      />
                      {fieldError(
                        (errors.variantes?.[index] as { prixHT?: { message?: string } })?.prixHT
                          ?.message
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={watchedVariantes[index]?.tauxTVAId ?? ''}
                        onValueChange={(v) => setValue(`variantes.${index}.tauxTVAId`, v ?? '')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="TVA…" />
                        </SelectTrigger>
                        <SelectContent>
                          {tauxTVAList.filter((t) => t.actif).map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.taux}% — {t.libelle}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <span className="inline-block rounded bg-green-50 px-2 py-1.5 text-sm font-medium text-green-700 tabular-nums">
                        {computeTTC(index)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Input
                        {...register(`variantes.${index}.sku`)}
                        placeholder="Auto"
                        className="w-full font-mono text-xs"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={watchedVariantes[index]?.venteAuPoids ?? false}
                        onCheckedChange={(v) => setValue(`variantes.${index}.venteAuPoids`, v)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={watchedVariantes[index]?.actif ?? true}
                        onCheckedChange={(checked) => handleVarianteToggle(index, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setVarianteDeleteIndex(index)}
                        className="text-zinc-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Paliers de remise par quantité */}
      <PaliersSection
        variantesAvecId={watchedVariantes
          .filter((v) => v.id && v.actif)
          .map((v) => {
            const emb = EMBALLAGE_LABELS[v.emballage] ?? v.emballage
            const label = v.poids ? `${v.poids} kg · ${emb}` : emb
            return { id: v.id!, label, venteAuPoids: v.venteAuPoids ?? false }
          })}
      />

      {/* Confirmation suppression/désactivation variante */}
      <DeactivateDialog
        open={varianteDeleteIndex !== null}
        onOpenChange={(open) => !open && setVarianteDeleteIndex(null)}
        label="cette variante"
        description={
          varianteDeleteIndex !== null && watchedVariantes[varianteDeleteIndex]?.id && produit
            ? 'Cette variante sera désactivée et ne sera plus visible dans le POS.'
            : 'La variante sera retirée du formulaire.'
        }
        onConfirm={() => {
          if (varianteDeleteIndex === null) return
          const dbId = watchedVariantes[varianteDeleteIndex]?.id
          if (dbId && produit) {
            update(varianteDeleteIndex, { ...watchedVariantes[varianteDeleteIndex], actif: false })
            void patchVarianteStatut(dbId, false)
            toast.success('Variante désactivée')
          } else {
            remove(varianteDeleteIndex)
          }
          setVarianteDeleteIndex(null)
        }}
      />

      {/* Modal étiquettes */}
      {showLabels && produit && (
        <LabelPrintModal produit={produit} onClose={() => setShowLabels(false)} />
      )}

      {/* Confirmation désactivation variante */}
      <DeactivateDialog
        open={!!varianteDeactivate}
        onOpenChange={(open) => !open && setVarianteDeactivate(null)}
        label="cette variante"
        description="Cette variante ne sera plus visible dans le POS."
        onConfirm={() => {
          if (!varianteDeactivate) return
          const { index, id } = varianteDeactivate
          update(index, { ...watchedVariantes[index], actif: false })
          if (id && produit) void patchVarianteStatut(id, false)
          setVarianteDeactivate(null)
          toast.success('Variante désactivée')
        }}
      />
    </form>
  )
}
