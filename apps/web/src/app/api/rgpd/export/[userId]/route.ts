import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'

type Params = { params: Promise<{ userId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { session, error } = await requireAuth(['GERANT'])
  if (error) return error

  const { userId } = await params

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      role: true,
      actif: true,
      createdAt: true,
      lastLoginAt: true,
      rgpdConsent: true,
      rgpdConsentDate: true,
      ventes: {
        where: { statut: 'FINALISEE' },
        select: {
          id: true,
          numeroTicket: true,
          date: true,
          totalTTC: true,
          statut: true,
        },
        orderBy: { date: 'desc' },
        take: 100,
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const auditLogs = await prisma.journalAudit.findMany({
    where: { userId },
    select: { action: true, entite: true, timestamp: true, ip: true },
    orderBy: { timestamp: 'desc' },
    take: 200,
  })

  const exportData = {
    exportDate: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      actif: user.actif,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      rgpdConsent: user.rgpdConsent,
      rgpdConsentDate: user.rgpdConsentDate,
    },
    ventes: user.ventes.map((v) => ({ ...v, totalTTC: Number(v.totalTTC) })),
    journalConnexions: auditLogs,
  }

  await logAudit({
    userId: session.user.id,
    action: 'EXPORT_DONNEES_RGPD',
    entite: 'User',
    entiteId: userId,
  })

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="export-rgpd-${userId.slice(0, 8)}.json"`,
    },
  })
}
