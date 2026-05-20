import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

export type Session = {
  id: string
  email: string
  role: 'GERANT' | 'VENDEUR'
}

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-jwt-secret-change-in-production'
)

export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return null

    const { payload } = await jwtVerify(token, secret)
    return {
      id: payload.sub as string,
      email: payload.email as string,
      role: payload.role as 'GERANT' | 'VENDEUR',
    }
  } catch {
    return null
  }
}
