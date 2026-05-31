import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Leaf } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const login = (new FormData(e.currentTarget).get('login') as string).trim()
    if (!login) return

    setPending(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Erreur')
        return
      }
      setSent(true)
    } catch {
      setError('Une erreur est survenue. Réessayez.')
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

      <Card className="relative z-10 w-full max-w-sm border-green-100 bg-white/90 shadow-2xl shadow-green-900/10 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-600 shadow-lg shadow-green-600/30">
            <Leaf className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-xl font-bold text-green-950">Mot de passe oublié</CardTitle>
          <CardDescription className="text-green-800/60">
            {sent ? 'Vérifiez votre boîte mail' : 'Entrez votre identifiant ou email'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-zinc-600">
                Si un compte correspond à cet identifiant, un email a été envoyé avec un lien de
                réinitialisation valable 1 heure.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-sm text-green-700 hover:text-green-900 hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="login" className="font-medium text-green-900/80">
                  Identifiant ou email
                </Label>
                <Input
                  id="login"
                  name="login"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoFocus
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? 'Envoi…' : 'Envoyer le lien'}
              </Button>
              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-sm text-green-700 hover:text-green-900 hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Retour à la connexion
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
