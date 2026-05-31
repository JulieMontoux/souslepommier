import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Leaf } from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { ApiError } from '@/lib/api'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard'

  const resetDone = (location.state as { reset?: boolean })?.reset === true
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const username = (formData.get('username') as string).trim()
    const password = formData.get('password') as string

    setPending(true)
    try {
      const user = await login(username, password)
      navigate(user.role === 'VENDEUR' ? '/pos' : from, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 429
            ? 'Trop de tentatives. Réessayez dans 15 minutes.'
            : 'Identifiant ou mot de passe incorrect.'
        )
      } else {
        setError('Une erreur est survenue. Réessayez.')
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
      <div
        className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, oklch(0.80 0.14 150), transparent 70%)' }}
      />

      <Card className="relative z-10 w-full max-w-sm border-green-100 bg-white/90 shadow-2xl shadow-green-900/10 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-600 shadow-lg shadow-green-600/30">
            <Leaf className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-xl font-bold text-green-950">Sous le Pommier</CardTitle>
          <CardDescription className="text-green-800/60">
            Connectez-vous à votre espace caisse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {resetDone && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <AlertDescription>Mot de passe modifié. Connectez-vous.</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username" className="font-medium text-green-900/80">
                Identifiant
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                placeholder="prenom.nom"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-medium text-green-900/80">
                Mot de passe
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Connexion…' : 'Se connecter'}
            </Button>
            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-green-700 hover:text-green-900 hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
