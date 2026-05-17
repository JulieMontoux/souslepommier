import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'

export const metadata = {
  title: 'Connexion — Sous le Pommier',
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
