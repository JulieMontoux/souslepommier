'use client'

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/contexts/auth'
import { ApiError } from '@/lib/api'

const schema = z.object({
  username: z.string().min(1, 'Identifiant requis'),
  password: z.string().min(1, 'Mot de passe requis'),
})

export function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/dashboard'

  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({})

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    const raw = {
      username: formData.get('username') as string,
      password: formData.get('password') as string,
    }

    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors
      setFieldErrors({ username: errors.username?.[0], password: errors.password?.[0] })
      return
    }

    setIsPending(true)
    try {
      const user = await login(raw.username, raw.password)
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
      setIsPending(false)
    }
  }

  return (
    <Card className="relative z-10 w-full max-w-sm border-slate-200 bg-white shadow-2xl">
      <CardHeader className="space-y-1 pb-4 text-center">
        <div className="mx-auto mb-3">
          <img src="/favicon.svg" alt="Sous le Pommier" className="h-14 w-14 rounded-xl object-contain" />
        </div>
        <CardTitle className="text-xl font-semibold text-slate-900">Sous le Pommier</CardTitle>
        <CardDescription className="text-slate-500">
          Connectez-vous à votre espace caisse
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="username" className="text-slate-700">
              Identifiant
            </Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="prenom.nom"
              autoComplete="username"
              autoCapitalize="none"
              disabled={isPending}
              required
              className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-green-500"
            />
            {fieldErrors.username && <p className="text-sm text-red-500">{fieldErrors.username}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-700">
              Mot de passe
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              disabled={isPending}
              required
              className="border-slate-300 bg-white text-slate-900 focus-visible:ring-green-500"
            />
            {fieldErrors.password && <p className="text-sm text-red-500">{fieldErrors.password}</p>}
          </div>

          <Button
            type="submit"
            className="w-full bg-green-600 text-white hover:bg-green-700"
            disabled={isPending}
          >
            {isPending ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
