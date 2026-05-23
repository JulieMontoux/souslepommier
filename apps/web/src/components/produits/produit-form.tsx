'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { calcPrixTTC } from '@/lib/tva'
import { TYPE_EMBALLAGE } from '@/lib/validations/produit'
import type { ProduitComplet } from '@/types/produits'
import type { Categorie } from '@souslepommier/database'
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
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import Link from 'next/link'

// ─── Schéma formulaire ────────────────────────────────────────────────────────

const varianteRowSchema = z.object({
  id: z.string().optional(),
  poids: z.string().optional(),
  emballage: z.enum(TYPE_EMBALLAGE),
  prixHT: z.string().min(1, 'Requis'),
  tauxTVA: z.string().min(1, 'Requis'),
  sku: z.string().optional(),
  actif: z.boolean().default(true),
})

const formSchema = z.object({
  nom: z.string().min(1, 'Nom requis').max(100),
  categorieId: z.string().optional(),
  description: z.string().max(500).optional(),
  actif: z.boolean().default(true),
  variantes: z.array(varianteRowSchema),
})

type FormValues = z.infer<typeof formSchema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProduitFormProps {
  produit?: ProduitComplet | null
  categories: Categorie[]
}

const TAUX_TVA_COMMUNS = [0, 5.5, 10, 20]
const EMBALLAGE_LABELS: Record<string, string> = {
  VRAC: 'Vrac',
  BARQUETTE: 'Barquette',
  FILET: 'Filet',
  SAC: 'Sac',
  CAISSE: 'Caisse',
  PLATEAU: 'Plateau',
}

export function ProduitForm({ produit, categories }: ProduitFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [varianteDeactivate, setVarianteDeactivate] = useState<{
    index: number
    id?: string
  } | null>(null)

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
      variantes:
        produit?.variantes.map((v) => ({
          id: v.id,
          poids: v.poids != null ? String(v.poids) : '',
          emballage: v.emballage as (typeof TYPE_EMBALLAGE)[number],
          prixHT: String(v.prixHT),
          tauxTVA: String(v.tauxTVA),
          sku: v.sku ?? '',
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
    const tva = parseFloat(row.tauxTVA)
    if (isNaN(ht) || isNaN(tva)) return '—'
    return calcPrixTTC(ht, tva).toFixed(2).replace('.', ',') + ' €'
  }

  function addVariante() {
    append({ poids: '', emballage: 'VRAC', prixHT: '', tauxTVA: '5.5', sku: '', actif: true })
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
      }

      // 2. Sauvegarder les variantes
      for (const variante of data.variantes) {
        const poidsNum = variante.poids ? parseFloat(variante.poids) : null
        const variantePayload = {
          poids: isNaN(poidsNum as number) ? null : poidsNum,
          emballage: variante.emballage,
          prixHT: parseFloat(variante.prixHT),
          tauxTVA: parseFloat(variante.tauxTVA),
          sku: variante.sku || null,
          actif: variante.actif,
        }

        if (variante.id && isEditing) {
          await fetch(`/api/variantes/${variante.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(variantePayload),
          })
        } else {
          await fetch(`/api/produits/${produitId}/variantes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(variantePayload),
          })
        }
      }

      toast.success(isEditing ? 'Produit mis à jour' : 'Produit créé')
      startTransition(() => router.push('/dashboard/produits'))
      router.refresh()
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
            href="/dashboard/produits"
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
        <Button type="submit" disabled={saving || isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </Button>
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
                        defaultValue={field.tauxTVA ?? '5.5'}
                        onValueChange={(v) => setValue(`variantes.${index}.tauxTVA`, v ?? '')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TAUX_TVA_COMMUNS.map((t) => (
                            <SelectItem key={t} value={String(t)}>
                              {t}%
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
                        checked={watchedVariantes[index]?.actif ?? true}
                        onCheckedChange={(checked) => handleVarianteToggle(index, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
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
