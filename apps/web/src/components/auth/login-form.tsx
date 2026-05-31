'use client'

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Leaf } from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { ApiError } from '@/lib/api'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

export function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/dashboard'

  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    const raw = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    }

    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors
      setFieldErrors({ email: errors.email?.[0], password: errors.password?.[0] })
      return
    }

    setIsPending(true)
    try {
      const user = await login(raw.email, raw.password)
      navigate(user.role === 'VENDEUR' ? '/pos' : from, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 429
            ? 'Trop de tentatives. Réessayez dans 15 minutes.'
            : 'Email ou mot de passe incorrect.'
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
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-600 shadow-lg shadow-green-900/40">
          <Leaf className="h-6 w-6 text-white" />
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
            <Label htmlFor="email" className="text-slate-700">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="prenom.nom@exemple.fr"
              autoComplete="email"
              disabled={isPending}
              required
              className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-green-500"
            />
            {fieldErrors.email && <p className="text-sm text-red-500">{fieldErrors.email}</p>}
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
