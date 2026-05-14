'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Save, Plus, Trash2, Search } from 'lucide-react'
import Link from 'next/link'
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
import { roundFiscal, calcMontantTVA } from '@/lib/tva'
import type { ClientComplet } from '@/types/client'

const TVA_TAUX = ['0', '5.5', '10', '20'] as const

type FormValues = {
  clientId: string
  mode: 'manuel' | 'vente'
  venteTicket: string
  lignes: Array<{
    designation: string
    qte: string
    prixUnitaireHT: string
    tauxTVA: string
    remise: string
  }>
  dateEcheance: string
  dateLivraison: string
  notes: string
  statut: 'BROUILLON' | 'EMISE'
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
    montantTVA: number | string
    montantTTC: number | string
    remise: number | string
    variante?: { produit: { nom: string }; poids?: number | string | null; emballage: string }
  }>
}

interface FactureFormProps {
  clients: ClientComplet[]
}

const EMBALLAGE: Record<string, string> = {
  VRAC: '',
  BARQUETTE: 'barquette',
  FILET: 'filet',
  SAC: 'sac',
  CAISSE: 'caisse',
  PLATEAU: 'plateau',
}

export function FactureForm({ clients }: FactureFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [ventePreview, setVentePreview] = useState<VentePreview | null>(null)
  const [searching, setSearching] = useState(false)

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
      lignes: [{ designation: '', qte: '1', prixUnitaireHT: '', tauxTVA: '20', remise: '0' }],
      dateEcheance: '',
      dateLivraison: '',
      notes: '',
      statut: 'BROUILLON',
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lignes' })
  const mode = watch('mode')
  const lignes = watch('lignes')

  // Compute line totals for preview
  const lignesComputed = lignes.map((l) => {
    const qte = parseFloat(l.qte) || 0
    const puHT = parseFloat(l.prixUnitaireHT) || 0
    const tva = parseFloat(l.tauxTVA) || 0
    const remise = parseFloat(l.remise) || 0
    const puHTRemise = roundFiscal(puHT * (1 - remise / 100))
    const montantHT = roundFiscal(puHTRemise * qte)
    const montantTVA = calcMontantTVA(montantHT, tva)
    return { montantHT, montantTVA, montantTTC: roundFiscal(montantHT + montantTVA) }
  })

  const totalTTC = roundFiscal(lignesComputed.reduce((s, l) => s + l.montantTTC, 0))

  async function searchVente() {
    const ticket = watch('venteTicket')?.trim()
    if (!ticket) return
    setSearching(true)
    try {
      // Search by ticket number via list endpoint
      const res = await fetch(`/api/ventes?q=${encodeURIComponent(ticket)}`)
      const data = await res.json()
      const ventes = Array.isArray(data) ? data : []
      const found = ventes.find((v: { numeroTicket: string }) => v.numeroTicket === ticket)
      if (!found) {
        // Try direct by ID
        const res2 = await fetch(`/api/ventes/${ticket}`)
        if (res2.ok) {
          setVentePreview(await res2.json())
        } else {
          toast.error('Vente introuvable')
        }
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
        let payload: Record<string, unknown>

        if (values.mode === 'vente') {
          if (!ventePreview) {
            toast.error('Sélectionnez une vente')
            return
          }
          payload = {
            clientId: values.clientId,
            venteId: ventePreview.id,
            dateEcheance: values.dateEcheance ? new Date(values.dateEcheance).toISOString() : null,
            dateLivraison: values.dateLivraison
              ? new Date(values.dateLivraison).toISOString()
              : null,
            notes: values.notes || null,
            statut: values.statut,
          }
        } else {
          const lignesPayload = values.lignes.map((l) => ({
            designation: l.designation,
            qte: parseFloat(l.qte),
            prixUnitaireHT: parseFloat(l.prixUnitaireHT),
            tauxTVA: parseFloat(l.tauxTVA),
            remise: parseFloat(l.remise) || 0,
          }))
          payload = {
            clientId: values.clientId,
            lignes: lignesPayload,
            dateEcheance: values.dateEcheance ? new Date(values.dateEcheance).toISOString() : null,
            dateLivraison: values.dateLivraison
              ? new Date(values.dateLivraison).toISOString()
              : null,
            notes: values.notes || null,
            statut: values.statut,
          }
        }

        const res = await fetch('/api/factures', {
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
        toast.success('Facture créée')
        router.push(`/dashboard/factures/${id}`)
        router.refresh()
      } catch {
        toast.error('Erreur réseau')
      }
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/factures"
          className={buttonVariants({ variant: 'ghost', size: 'icon' })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-zinc-900">Nouvelle facture</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Client + statut */}
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
                  setValue('statut', (v ?? 'BROUILLON') as 'BROUILLON' | 'EMISE')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BROUILLON">Brouillon</SelectItem>
                  <SelectItem value="EMISE">Émettre directement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateLivraison">Date prestation / livraison</Label>
              <Input id="dateLivraison" type="date" {...register('dateLivraison')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateEcheance">Échéance (facultatif)</Label>
              <Input id="dateEcheance" type="date" {...register('dateEcheance')} />
            </div>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setValue('mode', 'manuel')}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                mode === 'manuel'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              )}
            >
              Lignes manuelles
            </button>
            <button
              type="button"
              onClick={() => setValue('mode', 'vente')}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                mode === 'vente'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              )}
            >
              Depuis une vente caisse
            </button>
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
                        {name} × {Number(l.qte)} —{' '}
                        {Number(l.montantTTC).toFixed(2).replace('.', ',')} € TTC
                      </p>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Columns header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-zinc-500">
                <span className="col-span-4">Désignation</span>
                <span className="col-span-1 text-center">Qté</span>
                <span className="col-span-2 text-right">PU HT</span>
                <span className="col-span-1 text-center">TVA</span>
                <span className="col-span-1 text-center">Rem.</span>
                <span className="col-span-2 text-right">TTC</span>
                <span className="col-span-1" />
              </div>
              {fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-12 items-center gap-2">
                  <Input
                    {...register(`lignes.${idx}.designation`)}
                    placeholder="Désignation"
                    className="col-span-4 h-8 text-sm"
                  />
                  <Input
                    {...register(`lignes.${idx}.qte`)}
                    type="number"
                    step="0.001"
                    min="0.001"
                    className="col-span-1 h-8 text-center text-sm"
                  />
                  <Input
                    {...register(`lignes.${idx}.prixUnitaireHT`)}
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="0.00"
                    className="col-span-2 h-8 text-right text-sm"
                  />
                  <select
                    {...register(`lignes.${idx}.tauxTVA`)}
                    className="col-span-1 h-8 rounded-md border border-zinc-200 bg-white px-1 text-center text-sm"
                  >
                    {TVA_TAUX.map((t) => (
                      <option key={t} value={t}>
                        {t}%
                      </option>
                    ))}
                  </select>
                  <Input
                    {...register(`lignes.${idx}.remise`)}
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0"
                    className="col-span-1 h-8 text-center text-sm"
                  />
                  <div className="col-span-2 text-right text-sm font-medium text-zinc-700">
                    {lignesComputed[idx]?.montantTTC.toFixed(2).replace('.', ',')} €
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
              <button
                type="button"
                onClick={() =>
                  append({
                    designation: '',
                    qte: '1',
                    prixUnitaireHT: '',
                    tauxTVA: '20',
                    remise: '0',
                  })
                }
                className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter une ligne
              </button>
              {mode === 'manuel' && (
                <div className="flex justify-end border-t border-zinc-100 pt-3 text-sm font-bold text-zinc-900">
                  Total TTC : {totalTTC.toFixed(2).replace('.', ',')} €
                </div>
              )}
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
          <Link href="/dashboard/factures" className={buttonVariants({ variant: 'ghost' })}>
            Annuler
          </Link>
          <Button type="submit" disabled={isPending} className="gap-1.5">
            <Save className="h-4 w-4" />
            {isPending ? 'Enregistrement…' : 'Créer la facture'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}
