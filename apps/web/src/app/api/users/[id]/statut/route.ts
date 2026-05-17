import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { userStatutSchema } from '@/lib/validations/user'
import { logAudit } from '@/lib/audit'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth(['GERANT'])
  if (error) return error

  const { id } = await params
  const gerantId = (session?.user as { id?: string })?.id

  if (id === gerantId) {
    return NextResponse.json({ error: 'Impossible de se désactiver soi-même' }, { status: 409 })
  }

  const body = await req.json()
  const parsed = userStatutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 422 })
  }

  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

  await prisma.user.update({ where: { id }, data: { actif: parsed.data.actif } })

  await logAudit({
    userId: gerantId,
    action: parsed.data.actif ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
    entite: 'User',
    entiteId: id,
    nouvelleValeur: { actif: parsed.data.actif },
  })

  return new Response(null, { status: 204 })
}
