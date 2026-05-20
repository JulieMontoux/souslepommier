import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { clientCreateSchema } from '@/lib/validations/client'
import { apiProxy } from '@/lib/api-proxy'
import type { Client } from '@souslepommier/database'

export async function GET(req: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error
  const session = authResult.session
  // session is guaranteed to be non-null because error is null
  if (!session?.user) {
    // defensive, should not happen
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const qParam = searchParams.get('q')
  const q = qParam?.trim()
  const actifParam = searchParams.get('actif')
  const actif = actifParam

  // Build query parameters for NestJS API
  const params = new URLSearchParams()
  if (q !== undefined && q !== '') params.append('q', q)
  if (actif !== null) params.append('actif', actif === 'false' ? 'false' : 'true')

  try {
    const clients = await apiProxy<Client[]>(`/api/clients?${params.toString()}`)
    return NextResponse.json(clients)
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const authResult = await requireAuth(['GERANT'])
  if (authResult.error) return authResult.error
  const session = authResult.session
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = clientCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  try {
    const client = await apiProxy<Client>(`/api/clients`, {
      method: 'POST',
      body: parsed.data,
    })

    const userId = (session?.user as { id?: string })?.id
    await logAudit({
      userId,
      action: 'CREATE',
      entite: 'Client',
      entiteId: client.id,
      nouvelleValeur: { raisonSociale: client.raisonSociale },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
