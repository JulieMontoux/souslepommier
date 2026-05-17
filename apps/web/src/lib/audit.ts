import { prisma } from '@/lib/prisma'
import type { Prisma } from '@souslepommier/database'

type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGIN_BLOCKED'
  | 'LOGOUT'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'DEACTIVATE'
  | 'ACTIVATE'
  | 'CREATE_VENTE'
  | 'ANNULER_VENTE'
  | 'CREATE_FACTURE'
  | 'EMIT_FACTURE'
  | 'PAY_FACTURE'
  | 'ANNULER_FACTURE'
  | 'CREATE_AVOIR'
  | 'CLOTURE_CAISSE'
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'DELETE_USER_RGPD'
  | 'ACTIVATE_USER'
  | 'DEACTIVATE_USER'
  | 'RESET_PASSWORD'
  | 'CREATE_TAUX_TVA'
  | 'UPDATE_TAUX_TVA'
  | 'TOGGLE_TAUX_TVA'
  | 'CREATE_DEMANDE_RGPD'
  | 'PROCESS_DEMANDE_RGPD'
  | 'EXPORT_DONNEES_RGPD'

export async function logAudit({
  userId,
  action,
  entite,
  entiteId,
  ancienneValeur,
  nouvelleValeur,
  ip,
  userAgent,
}: {
  userId?: string
  action: AuditAction
  entite: string
  entiteId?: string
  ancienneValeur?: Record<string, unknown>
  nouvelleValeur?: Record<string, unknown>
  ip?: string
  userAgent?: string
}) {
  try {
    await prisma.journalAudit.create({
      data: {
        userId: userId ?? null,
        action,
        entite,
        entiteId: entiteId ?? null,
        ancienneValeur: (ancienneValeur as Prisma.InputJsonValue) ?? undefined,
        nouvelleValeur: (nouvelleValeur as Prisma.InputJsonValue) ?? undefined,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      },
    })
  } catch {
    // Les erreurs d'audit ne doivent pas bloquer les opérations métier
    console.error('[AUDIT] Failed to log:', action, entite)
  }
}
