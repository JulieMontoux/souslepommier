import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

const PAGE_SIZE = 50

export async function GET(req: Request) {
  const { error } = await requireAuth(['GERANT'])
  if (error) return error

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') || undefined
  const action = searchParams.get('action') || undefined
  const entite = searchParams.get('entite') || undefined
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const csv = searchParams.get('format') === 'csv'

  const where = {
    ...(userId && { userId }),
    ...(action && { action }),
    ...(entite && { entite }),
    ...(from || to
      ? {
          timestamp: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
          },
        }
      : {}),
  }

  if (csv) {
    const logs = await prisma.journalAudit.findMany({
      where,
      include: { user: { select: { prenom: true, nom: true } } },
      orderBy: { timestamp: 'desc' },
      take: 10000,
    })

    const rows = [
      'timestamp,user,action,entite,entiteId,ip',
      ...logs.map((l) => {
        const user = l.user ? `${l.user.prenom} ${l.user.nom}` : 'Système'
        return [
          new Date(l.timestamp).toISOString(),
          `"${user}"`,
          l.action,
          l.entite,
          l.entiteId ?? '',
          l.ip ?? '',
        ].join(',')
      }),
    ].join('\n')

    return new Response(rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  const [logs, total] = await Promise.all([
    prisma.journalAudit.findMany({
      where,
      include: { user: { select: { prenom: true, nom: true } } },
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.journalAudit.count({ where }),
  ])

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      timestamp: l.timestamp.toISOString(),
      userId: l.userId,
      userName: l.user ? `${l.user.prenom} ${l.user.nom}` : null,
      action: l.action,
      entite: l.entite,
      entiteId: l.entiteId,
      ip: l.ip,
      userAgent: l.userAgent,
      ancienneValeur: l.ancienneValeur,
      nouvelleValeur: l.nouvelleValeur,
    })),
    total,
    page,
    pages: Math.ceil(total / PAGE_SIZE),
  })
}
