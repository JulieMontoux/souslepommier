import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

type Role = 'GERANT' | 'VENDEUR'

export async function requireAuth(roles?: Role[]) {
  const session = await auth()
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }), session: null }
  }
  const role = (session.user as { role?: string }).role as Role
  if (roles && !roles.includes(role)) {
    return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }), session: null }
  }
  return { error: null, session }
}
