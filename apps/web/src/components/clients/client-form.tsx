'use client'

import { useTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { clientCreateSchema, clientUpdateSchema } from '@/lib/validations/client'
import type { ClientComplet } from '@/types/client'

const CONDITIONS_OPTIONS = [
  { value: '0', label: 'Comptant' },
  { value: '30', label: '30 jours' },
  { value: '45', label: '45 jours' },
  { value: '60', label: '60 jours' },
]

const formSchema = z.object({
  raisonSociale: z.string().min(1, 'Requis').max(200),
  siret: z.string().optional(),
  tvaIntracommunautaire: z.string().optional(),
  adresse: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
  pays: z.string().default('FR'),
  email: z.string().optional(),
  telephone: z.string().optional(),
  conditionsPaiement: z.string().default('30'),
  notes: z.string().optional(),
  actif: z.boolean().default(true),
})

type FormValues = z.infer<typeof formSchema>

interface ClientFormProps {
  client?: ClientComplet
}

export function ClientForm({ client }: ClientFormProps) {
  const navigate = useNavigate()
  const [isPending, startTransition] = useTransition()
  const isEdit = !!client

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      raisonSociale: client?.raisonSociale ?? '',
      siret: client?.siret ?? '',
      tvaIntracommunautaire: client?.tvaIntracommunautaire ?? '',
      adresse: client?.adresse ?? '',
      codePostal: client?.codePostal ?? '',
      ville: client?.ville ?? '',
      pays: client?.pays ?? 'FR',
      email: client?.email ?? '',
      telephone: client?.telephone ?? '',
      conditionsPaiement: String(client?.conditionsPaiement ?? 30),
      notes: client?.notes ?? '',
      actif: client?.actif ?? true,
    },
  })

  const actif = watch('actif')

  function toPayload(values: FormValues) {
    return {
      raisonSociale: values.raisonSociale,
      siret: values.siret?.trim() || null,
      tvaIntracommunautaire: values.tvaIntracommunautaire?.trim() || null,
      adresse: values.adresse?.trim() || null,
      codePostal: values.codePostal?.trim() || null,
      ville: values.ville?.trim() || null,
      pays: values.pays || 'FR',
      email: values.email?.trim() || null,
      telephone: values.telephone?.trim() || null,
      conditionsPaiement: parseInt(values.conditionsPaiement),
      notes: values.notes?.trim() || null,
      actif: values.actif,
    }
  }

  function onSubmit(values: FormValues) {
    const payload = toPayload(values)
    const schema = isEdit ? clientUpdateSchema : clientCreateSchema
    const parsed = schema.safeParse(payload)
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors
      const first = Object.values(flat)[0]?.[0]
      toast.error(first ?? 'Données invalides')
      return
    }

    startTransition(async () => {
      try {
        const url = isEdit ? `/api/clients/${client!.id}` : '/api/clients'
        const method = isEdit ? 'PUT' : 'POST'
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.data),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error((err as { error?: string }).error ?? 'Erreur serveur')
          return
        }
        toast.success(isEdit ? 'Client mis à jour' : 'Client créé')
        navigate('/dashboard/clients')
        window.location.reload()
      } catch {
        toast.error('Erreur réseau')
      }
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard/clients"
          className={buttonVariants({ variant: 'ghost', size: 'icon' })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-zinc-900">
          {isEdit ? 'Modifier le client' : 'Nouveau client'}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        {/* Raison sociale */}
        <div className="space-y-1.5">
          <Label htmlFor="raisonSociale">Raison sociale *</Label>
          <Input id="raisonSociale" {...register('raisonSociale')} />
          {errors.raisonSociale && (
            <p className="text-xs text-red-500">{errors.raisonSociale.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* SIRET */}
          <div className="space-y-1.5">
            <Label htmlFor="siret">SIRET</Label>
            <Input id="siret" {...register('siret')} placeholder="14 chiffres" maxLength={14} />
            {errors.siret && <p className="text-xs text-red-500">{errors.siret.message}</p>}
          </div>
          {/* TVA */}
          <div className="space-y-1.5">
            <Label htmlFor="tvaIntracommunautaire">N° TVA intracommunautaire</Label>
            <Input
              id="tvaIntracommunautaire"
              {...register('tvaIntracommunautaire')}
              placeholder="FR + 11 chiffres"
            />
            {errors.tvaIntracommunautaire && (
              <p className="text-xs text-red-500">{errors.tvaIntracommunautaire.message}</p>
            )}
          </div>
        </div>

        {/* Adresse */}
        <div className="space-y-1.5">
          <Label htmlFor="adresse">Adresse</Label>
          <Input id="adresse" {...register('adresse')} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="codePostal">Code postal</Label>
            <Input id="codePostal" {...register('codePostal')} maxLength={5} />
            {errors.codePostal && (
              <p className="text-xs text-red-500">{errors.codePostal.message}</p>
            )}
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="ville">Ville</Label>
            <Input id="ville" {...register('ville')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email facturation</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>
          {/* Téléphone */}
          <div className="space-y-1.5">
            <Label htmlFor="telephone">Téléphone</Label>
            <Input id="telephone" {...register('telephone')} />
          </div>
        </div>

        {/* Conditions de paiement */}
        <div className="space-y-1.5">
          <Label>Conditions de paiement</Label>
          <Select
            defaultValue={String(client?.conditionsPaiement ?? 30)}
            onValueChange={(v) => setValue('conditionsPaiement', v ?? '30')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes internes</Label>
          <Textarea id="notes" {...register('notes')} rows={3} className="resize-none" />
        </div>

        {/* Actif (edit only) */}
        {isEdit && (
          <div className="flex items-center gap-3">
            <Switch id="actif" checked={actif} onCheckedChange={(v) => setValue('actif', v)} />
            <Label htmlFor="actif">Client actif</Label>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
          <Link to="/dashboard/clients" className={buttonVariants({ variant: 'ghost' })}>
            Annuler
          </Link>
          <Button type="submit" disabled={isPending} className="gap-1.5">
            <Save className="h-4 w-4" />
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </div>
  )
}
