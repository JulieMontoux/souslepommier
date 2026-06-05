import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
      style={{ background: 'linear-gradient(160deg, #EAF3F0 0%, #D5E9E2 50%, #EAF3F0 100%)' }}
    >
      <div
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-40"
        style={{ background: 'radial-gradient(circle, #B2D9CB, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, #8DC7B3, transparent 70%)' }}
      />

      <Card className="relative z-10 w-full max-w-sm border-[#C8DFD7] bg-white/95 shadow-xl shadow-[#8DC7B3]/20 backdrop-blur-sm pt-3 gap-2">
        <CardHeader className="px-4 pt-0 pb-0 text-center">
          <img src="/logo.png" alt="Sous le Pommier" className="w-full h-auto object-contain" />
          <CardDescription className="mt-1" style={{ color: '#4A8A7A' }}>
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
              <Label htmlFor="username" className="font-medium" style={{ color: '#2D4A3E' }}>
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
              <Label htmlFor="password" className="font-medium" style={{ color: '#2D4A3E' }}>
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
                className="text-sm hover:underline" style={{ color: '#4A8A7A' }}
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
