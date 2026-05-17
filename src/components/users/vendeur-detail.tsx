'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, KeyRound, CheckCircle, XCircle, Trash2, TrendingUp } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { UserDetail } from '@/types/user'

function fmt(n: number) {
  return n.toFixed(2).replace('.', ',') + ' €'
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface VendeurDetailViewProps {
  user: UserDetail
  isSelf: boolean
}

export function VendeurDetailView({ user, isSelf }: VendeurDetailViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showDelete, setShowDelete] = useState(false)

  function handleToggle() {
    startTransition(async () => {
      const res = await fetch(`/api/users/${user.id}/statut`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: !user.actif }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { error?: string }).error ?? 'Erreur')
        return
      }
      toast.success(user.actif ? 'Compte désactivé' : 'Compte activé')
      router.refresh()
    })
  }

  function handleResetPassword() {
    startTransition(async () => {
      const res = await fetch(`/api/users/${user.id}/reset-password`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { error?: string }).error ?? 'Erreur')
        return
      }
      toast.success('Nouveau mot de passe envoyé par email')
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { error?: string }).error ?? 'Erreur')
        return
      }
      toast.success('Compte anonymisé (RGPD)')
      router.push('/dashboard/vendeurs')
    })
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <Link
              href="/dashboard/vendeurs"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-2 -ml-2 gap-1')}
            >
              <ArrowLeft className="h-4 w-4" />
              Vendeurs
            </Link>
            <h1 className="text-2xl font-bold text-zinc-900">
              {user.prenom} {user.nom}
            </h1>
            <p className="text-sm text-zinc-500">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={user.role === 'GERANT' ? 'default' : 'secondary'}>
              {user.role === 'GERANT' ? 'Gérant' : 'Vendeur'}
            </Badge>
            {user.actif ? (
              <Badge variant="default" className="gap-1 bg-green-600">
                <CheckCircle className="h-3 w-3" />
                Actif
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" />
                Inactif
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Ventes ce mois', value: String(user.nbVentesMois) },
            { label: 'CA mois TTC', value: fmt(user.caMoisTTC) },
            { label: 'CA semaine TTC', value: fmt(user.caWeekTTC) },
            { label: 'Ventes total', value: String(user.nbVentesTotal) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">{label}</p>
              <p className="mt-1 text-xl font-bold text-zinc-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
            Informations
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Row label="Membre depuis" value={fmtDate(user.createdAt)} />
            <Row label="Dernière connexion" value={fmtDate(user.lastLoginAt)} />
            <Row label="CA mois HT" value={fmt(user.caMoisHT)} />
            <Row label="CA semaine HT" value={fmt(user.caWeekHT)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleResetPassword}
            disabled={isPending || !user.actif}
            className="gap-1.5"
          >
            <KeyRound className="h-4 w-4" />
            Réinitialiser mot de passe
          </Button>

          {!isSelf && (
            <Button
              variant="outline"
              onClick={handleToggle}
              disabled={isPending}
              className={cn('gap-1.5', user.actif ? 'text-amber-600 hover:text-amber-700' : '')}
            >
              {user.actif ? (
                <>
                  <XCircle className="h-4 w-4" />
                  Désactiver
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Activer
                </>
              )}
            </Button>
          )}

          {!isSelf && (
            <Button
              variant="outline"
              onClick={() => setShowDelete(true)}
              disabled={isPending}
              className="ml-auto gap-1.5 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Anonymiser (RGPD)
            </Button>
          )}
        </div>

        {user.nbVentesTotal === 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-400">
            <TrendingUp className="h-4 w-4" />
            Aucune vente enregistrée pour ce vendeur.
          </div>
        )}
      </div>

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="px-6 py-5">
              <h2 className="text-lg font-semibold text-zinc-900">Anonymiser le compte ?</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Les données personnelles seront effacées (RGPD). L&apos;historique des ventes est
                conservé. Cette action est irréversible.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-100 px-6 py-4">
              <Button variant="outline" onClick={() => setShowDelete(false)} disabled={isPending}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                Anonymiser
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="font-medium text-zinc-900">{value}</p>
    </div>
  )
}
