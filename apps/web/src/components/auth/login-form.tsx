'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Leaf } from 'lucide-react'
import { loginAction } from '@/app/(auth)/login/actions'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl')

  const [isPending, startTransition] = useTransition()
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

    startTransition(async () => {
      const result = await loginAction(raw.email, raw.password)
      if (result.error) {
        setError(result.error)
        return
      }
      router.push(callbackUrl ?? '/dashboard')
      router.refresh()
    })
  }

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-600">
          <Leaf className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold">Sous le Pommier</CardTitle>
        <CardDescription>Connectez-vous à votre espace caisse</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="prenom.nom@exemple.fr"
              autoComplete="email"
              disabled={isPending}
              required
            />
            {fieldErrors.email && <p className="text-sm text-red-500">{fieldErrors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              disabled={isPending}
              required
            />
            {fieldErrors.password && <p className="text-sm text-red-500">{fieldErrors.password}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
