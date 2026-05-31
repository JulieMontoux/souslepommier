'use client'

import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { configSchema, FORMES_JURIDIQUES, type ConfigFormValues } from '@/lib/validations/config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LogoUpload } from './logo-upload'
import { ConfigPreview } from './config-preview'
import { Save, Send } from 'lucide-react'

interface ConfigFormProps {
  initialConfig: (ConfigFormValues & { logoUrl?: string | null; smtpPassSet?: boolean }) | null
}

export function ConfigForm({ initialConfig }: ConfigFormProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(initialConfig?.logoUrl ?? null)
  const [saving, setSaving] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testingSMTP, setTestingSMTP] = useState(false)
  const [watchedValues, setWatchedValues] = useState<Partial<ConfigFormValues>>(initialConfig ?? {})

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema) as Resolver<ConfigFormValues>,
    defaultValues: {
      raisonSociale: initialConfig?.raisonSociale ?? '',
      formeJuridique: initialConfig?.formeJuridique ?? '',
      capitalSocial: initialConfig?.capitalSocial,
      siret: initialConfig?.siret ?? '',
      tvaIntracommunautaire: initialConfig?.tvaIntracommunautaire ?? '',
      adresse: initialConfig?.adresse ?? '',
      codePostal: initialConfig?.codePostal ?? '',
      ville: initialConfig?.ville ?? '',
      pays: initialConfig?.pays ?? 'FR',
      telephone: initialConfig?.telephone ?? '',
      email: initialConfig?.email ?? '',
      iban: initialConfig?.iban ?? '',
      rcs: initialConfig?.rcs ?? '',
      villeRCS: initialConfig?.villeRCS ?? '',
      codeAPE: initialConfig?.codeAPE ?? '',
      regimeTVA: initialConfig?.regimeTVA ?? 'NORMAL',
      responsableRGPD: initialConfig?.responsableRGPD ?? '',
      emailRGPD: initialConfig?.emailRGPD ?? '',
      smtpHost: initialConfig?.smtpHost ?? '',
      smtpPort: initialConfig?.smtpPort ?? '',
      smtpUser: initialConfig?.smtpUser ?? '',
      smtpPass: '',
      smtpFrom: initialConfig?.smtpFrom ?? '',
      smtpTls: initialConfig?.smtpTls ?? true,
    },
  })

  // Mise à jour aperçu en temps réel
  useEffect(() => {
    const subscription = watch((values) => setWatchedValues(values as Partial<ConfigFormValues>))
    return () => subscription.unsubscribe()
  }, [watch])

  async function onSubmit(data: ConfigFormValues) {
    setSaving(true)
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Erreur de sauvegarde')
        return
      }
      toast.success('Configuration sauvegardée')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  async function handleSmtpTest() {
    if (!testEmail) return
    setTestingSMTP(true)
    try {
      const res = await fetch('/api/config/smtp-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      })
      const data = await res.json()
      if (!res.ok) toast.error(data.error ?? 'Échec du test SMTP')
      else toast.success('Email de test envoyé !')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setTestingSMTP(false)
    }
  }

  function fieldError(name: keyof ConfigFormValues) {
    const msg = errors[name]?.message
    return msg ? <p className="mt-1 text-xs text-red-500">{msg}</p> : null
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Configuration entreprise</h1>
          <p className="text-sm text-zinc-500">
            Ces informations apparaissent sur tous les tickets et factures.
          </p>
        </div>
        <Button type="submit" disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </Button>
      </div>

      <Tabs defaultValue="identite">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="identite">Identité</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="fiscal">Fiscal & légal</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="apercu">Aperçu</TabsTrigger>
        </TabsList>

        {/* ── Onglet Identité ──────────────────────────────────────────────── */}
        <TabsContent value="identite" className="mt-4 space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-zinc-800">Logo</h2>
            <LogoUpload currentUrl={logoUrl} onUpload={setLogoUrl} />
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-zinc-800">Identification</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="raisonSociale">
                  Raison sociale <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="raisonSociale"
                  {...register('raisonSociale')}
                  placeholder="Sous le Pommier"
                />
                {fieldError('raisonSociale')}
              </div>

              <div>
                <Label htmlFor="formeJuridique">Forme juridique</Label>
                <Select
                  defaultValue={initialConfig?.formeJuridique ?? ''}
                  onValueChange={(v) => setValue('formeJuridique', v || undefined)}
                >
                  <SelectTrigger id="formeJuridique">
                    <SelectValue placeholder="Sélectionner…" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMES_JURIDIQUES.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="capitalSocial">Capital social (€)</Label>
                <Input
                  id="capitalSocial"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('capitalSocial')}
                  placeholder="1000"
                />
                {fieldError('capitalSocial')}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-zinc-800">Adresse</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input id="adresse" {...register('adresse')} placeholder="1 Route des Vergers" />
              </div>
              <div>
                <Label htmlFor="codePostal">Code postal</Label>
                <Input
                  id="codePostal"
                  {...register('codePostal')}
                  placeholder="75001"
                  maxLength={5}
                />
                {fieldError('codePostal')}
              </div>
              <div>
                <Label htmlFor="ville">Ville</Label>
                <Input id="ville" {...register('ville')} placeholder="Paris" />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Onglet Contact ───────────────────────────────────────────────── */}
        <TabsContent value="contact" className="mt-4 space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-zinc-800">Coordonnées</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="telephone">Téléphone</Label>
                <Input id="telephone" {...register('telephone')} placeholder="0600000000" />
                {fieldError('telephone')}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="contact@souslepommier.fr"
                />
                {fieldError('email')}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="iban">IBAN (pour factures virement)</Label>
                <Input
                  id="iban"
                  {...register('iban')}
                  placeholder="FR7630006000011234567890189"
                  className="font-mono"
                />
                {fieldError('iban')}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-zinc-800">Responsable RGPD</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="responsableRGPD">Nom du responsable</Label>
                <Input
                  id="responsableRGPD"
                  {...register('responsableRGPD')}
                  placeholder="Marie Dupont"
                />
              </div>
              <div>
                <Label htmlFor="emailRGPD">Email RGPD</Label>
                <Input
                  id="emailRGPD"
                  type="email"
                  {...register('emailRGPD')}
                  placeholder="dpo@souslepommier.fr"
                />
                {fieldError('emailRGPD')}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Onglet Fiscal & légal ────────────────────────────────────────── */}
        <TabsContent value="fiscal" className="mt-4 space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-zinc-800">Identification fiscale</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="siret">
                  SIRET <span className="text-xs text-zinc-400">(14 chiffres)</span>
                </Label>
                <Input
                  id="siret"
                  {...register('siret')}
                  placeholder="00000000000000"
                  maxLength={14}
                  className="font-mono"
                />
                {fieldError('siret')}
              </div>
              <div>
                <Label htmlFor="tvaIntracommunautaire">
                  N° TVA intracommunautaire{' '}
                  <span className="text-xs text-zinc-400">(ex: FR12345678901)</span>
                </Label>
                <Input
                  id="tvaIntracommunautaire"
                  {...register('tvaIntracommunautaire')}
                  placeholder="FR12345678901"
                  className="font-mono"
                />
                {fieldError('tvaIntracommunautaire')}
              </div>
              <div>
                <Label htmlFor="codeAPE">
                  Code APE/NAF <span className="text-xs text-zinc-400">(ex: 4711D)</span>
                </Label>
                <Input
                  id="codeAPE"
                  {...register('codeAPE')}
                  placeholder="4711D"
                  maxLength={5}
                  className="font-mono"
                />
                {fieldError('codeAPE')}
              </div>
              <div>
                <Label htmlFor="regimeTVA">Régime TVA</Label>
                <Select
                  defaultValue={initialConfig?.regimeTVA ?? 'NORMAL'}
                  onValueChange={(v) =>
                    setValue('regimeTVA', v as 'NORMAL' | 'SIMPLIFIE' | 'FRANCHISE')
                  }
                >
                  <SelectTrigger id="regimeTVA">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Régime réel normal</SelectItem>
                    <SelectItem value="SIMPLIFIE">Régime simplifié</SelectItem>
                    <SelectItem value="FRANCHISE">Franchise en base (art. 293B CGI)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-zinc-800">Immatriculation (RCS)</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="rcs">Numéro RCS</Label>
                <Input id="rcs" {...register('rcs')} placeholder="123 456 789" />
              </div>
              <div>
                <Label htmlFor="villeRCS">Ville d&apos;immatriculation</Label>
                <Input id="villeRCS" {...register('villeRCS')} placeholder="Paris" />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Onglet Email ─────────────────────────────────────────────────── */}
        <TabsContent value="email" className="mt-4 space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-zinc-800">Serveur SMTP sortant</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="smtpHost">Hôte SMTP</Label>
                <Input id="smtpHost" {...register('smtpHost')} placeholder="smtp.example.com" />
              </div>
              <div>
                <Label htmlFor="smtpPort">Port</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  min={1}
                  max={65535}
                  {...register('smtpPort')}
                  placeholder="587"
                />
              </div>
              <div>
                <Label htmlFor="smtpUser">Utilisateur</Label>
                <Input
                  id="smtpUser"
                  {...register('smtpUser')}
                  placeholder="user@example.com"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="smtpPass">
                  Mot de passe
                  {initialConfig?.smtpPassSet && (
                    <span className="ml-2 text-xs text-zinc-400">
                      (déjà configuré — laisser vide pour conserver)
                    </span>
                  )}
                </Label>
                <Input
                  id="smtpPass"
                  type="password"
                  {...register('smtpPass')}
                  placeholder={initialConfig?.smtpPassSet ? '••••••••' : 'Mot de passe SMTP'}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label htmlFor="smtpFrom">Adresse expéditeur</Label>
                <Input
                  id="smtpFrom"
                  {...register('smtpFrom')}
                  placeholder="Sous le Pommier <contact@example.com>"
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={watch('smtpTls') ?? true}
                  onCheckedChange={(v) => setValue('smtpTls', v)}
                />
                <Label>TLS/STARTTLS activé</Label>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-zinc-800">Test d&apos;envoi</h2>
            <p className="mb-3 text-sm text-zinc-500">
              Sauvegardez d&apos;abord la configuration, puis envoyez un email de test.
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="destinataire@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="max-w-xs"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSmtpTest}
                disabled={testingSMTP || !testEmail}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {testingSMTP ? 'Envoi…' : 'Envoyer test'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ── Onglet Aperçu ────────────────────────────────────────────────── */}
        <TabsContent value="apercu" className="mt-4">
          <ConfigPreview config={{ ...watchedValues, logoUrl }} />
        </TabsContent>
      </Tabs>
    </form>
  )
}
