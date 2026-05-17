'use server'

import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'
import { headers } from 'next/headers'

export async function loginAction(email: string, password: string) {
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    '0.0.0.0'
  const userAgent = headersList.get('user-agent') ?? ''

  try {
    await signIn('credentials', {
      email,
      password,
      ip,
      userAgent,
      redirect: false,
    })
    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.message?.includes('RATE_LIMITED')) {
        return { error: 'Trop de tentatives. Réessayez dans 15 minutes.' }
      }
      return { error: 'Email ou mot de passe incorrect.' }
    }
    return { error: 'Une erreur est survenue. Réessayez.' }
  }
}
