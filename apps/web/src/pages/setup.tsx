import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Leaf, ShieldCheck } from 'lucide-react'
import { api, ApiError } from '@/lib/api'

const schema = z.object({
  token: z.string().min(1, 'Token requis'),
  username: z
    .string()
    .min(1, 'Identifiant requis')
    .regex(/^[a-z0-9._-]+$/, 'Lettres minuscules, chiffres, . _ -'),
  prenom: z.string().min(1, 'Prénom requis'),
  nom: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  password: z.string().min(8, 'Minimum 8 caractères'),
  role: z.enum(['GERANT', 'VENDEUR']),
})

type FieldErrors = Partial<Record<keyof z.infer<typeof schema>, string>>

export default function SetupPage() {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [form, setForm] = useState({
    token: '',
    username: '',
    prenom: '',
    nom: '',
    email: '',
    password: '',
    role: 'GERANT' as 'GERANT' | 'VENDEUR',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setFieldErrors({})

    const parsed = schema.safeParse(form)
    if (!parsed.success) {
      const errs = parsed.error.flatten().fieldErrors
      setFieldErrors(
        Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, v?.[0]])) as FieldErrors
      )
      return
    }

    setPending(true)
    try {
      const user = (await api.post('/setup/create-user', {
        ...parsed.data,
        email: parsed.data.email || undefined,
      })) as {
        prenom: string
        nom: string
        role: string
        username: string
      }
      setSuccess(
        `Compte ${user.role === 'GERANT' ? 'Gérant' : 'Vendeur'} créé — ${user.prenom} ${user.nom} (identifiant : ${user.username})`
      )
      setForm((f) => ({ ...f, username: '', prenom: '', nom: '', email: '', password: '' }))
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) setError('Token invalide ou setup désactivé.')
        else if (err.status === 409) setError('Identifiant ou email déjà utilisé.')
        else setError('Erreur serveur.')
      } else {
        setError('Impossible de contacter le serveur.')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{
        background:
          'linear-gradient(135deg, oklch(0.97 0.02 150) 0%, oklch(0.99 0.005 150) 60%, oklch(0.97 0.015 200) 100%)',
      }}
    >
      <div
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, oklch(0.85 0.12 150), transparent 70%)' }}
      />

      <Card className="relative z-10 w-full max-w-md border-green-100 bg-white/90 shadow-2xl shadow-green-900/10 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-600 shadow-lg shadow-green-600/30">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-xl font-bold text-green-950">Administration</CardTitle>
          <CardDescription className="text-green-800/60">
            Création de compte — accès restreint
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="token" className="font-medium text-green-900/80">
                Token secret
              </Label>
              <Input
                id="token"
                type="password"
                autoComplete="off"
                autoFocus
                value={form.token}
                onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
                className={fieldErrors.token ? 'border-red-500' : ''}
              />
              {fieldErrors.token && <p className="text-xs text-red-500">{fieldErrors.token}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="font-medium text-green-900/80">
                Identifiant
              </Label>
              <Input
                id="username"
                autoCapitalize="none"
                autoComplete="off"
                placeholder="prenom.nom"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))}
                className={`font-mono ${fieldErrors.username ? 'border-red-500' : ''}`}
              />
              {fieldErrors.username && (
                <p className="text-xs text-red-500">{fieldErrors.username}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="prenom" className="font-medium text-green-900/80">
                  Prénom
                </Label>
                <Input
                  id="prenom"
                  value={form.prenom}
                  onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                  className={fieldErrors.prenom ? 'border-red-500' : ''}
                />
                {fieldErrors.prenom && <p className="text-xs text-red-500">{fieldErrors.prenom}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom" className="font-medium text-green-900/80">
                  Nom
                </Label>
                <Input
                  id="nom"
                  value={form.nom}
                  onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                  className={fieldErrors.nom ? 'border-red-500' : ''}
                />
                {fieldErrors.nom && <p className="text-xs text-red-500">{fieldErrors.nom}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="font-medium text-green-900/80">
                Email <span className="font-normal text-green-800/40">(optionnel)</span>
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="off"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={fieldErrors.email ? 'border-red-500' : ''}
              />
              {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-medium text-green-900/80">
                Mot de passe initial
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className={fieldErrors.password ? 'border-red-500' : ''}
              />
              {fieldErrors.password && (
                <p className="text-xs text-red-500">{fieldErrors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-medium text-green-900/80">Rôle</Label>
              <div className="flex gap-3">
                {(['GERANT', 'VENDEUR'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: r }))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      form.role === r
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-border text-muted-foreground hover:border-green-300'
                    }`}
                  >
                    {r === 'GERANT' ? 'Gérant' : 'Vendeur'}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Création…' : 'Créer le compte'}
            </Button>

            <p className="text-center text-xs text-green-800/40">
              <button
                type="button"
                className="underline underline-offset-2 hover:text-green-700"
                onClick={() => navigate('/login')}
              >
                Retour à la connexion
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
