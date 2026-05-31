'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, ShieldCheck, ShieldAlert, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const ACTION_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  LOGIN_SUCCESS: 'default',
  LOGIN_FAILED: 'destructive',
  LOGIN_BLOCKED: 'destructive',
  DEACTIVATE_USER: 'destructive',
  DELETE_USER_RGPD: 'destructive',
  ANNULER_VENTE: 'destructive',
  ANNULER_FACTURE: 'destructive',
}

type LogEntry = {
  id: string
  timestamp: string
  userId: string | null
  userName: string | null
  action: string
  entite: string
  entiteId: string | null
  ip: string | null
}

type RawLog = {
  id: string
  timestamp: string
  userId: string | null
  user: { prenom: string; nom: string } | null
  action: string
  entite: string
  entiteId: string | null
  ip: string | null
}

type VerifyResult = {
  valid: boolean
  nbVentesVerifiees: number
  nbCloturesVerifiees: number
  erreurs: string[]
}

export function AuditLog() {
  const [page, setPage] = useState(1)
  const [filterAction, setFilterAction] = useState('')
  const [filterEntite, setFilterEntite] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [verify, setVerify] = useState<VerifyResult | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['audit', filterAction, filterEntite, filterFrom, filterTo, page],
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (filterAction) qs.set('action', filterAction)
      if (filterEntite) qs.set('entite', filterEntite)
      if (filterFrom) qs.set('from', filterFrom)
      if (filterTo) qs.set('to', filterTo)
      qs.set('page', String(page))
      const res = await fetch(`/api/audit?${qs.toString()}`)
      if (!res.ok) {
        toast.error('Erreur chargement logs')
        throw new Error('Erreur chargement logs')
      }
      const json = await res.json()
      return {
        logs: (json.data as RawLog[]).map(
          (l): LogEntry => ({
            id: l.id,
            timestamp: l.timestamp,
            userId: l.userId,
            userName: l.user ? `${l.user.prenom} ${l.user.nom}` : null,
            action: l.action,
            entite: l.entite,
            entiteId: l.entiteId,
            ip: l.ip,
          })
        ),
        total: json.meta.total as number,
        pages: json.meta.totalPages as number,
      }
    },
  })

  const logs = data?.logs ?? []
  const total = data?.total ?? 0
  const pages = data?.pages ?? 1

  function resetFilters() {
    setFilterAction('')
    setFilterEntite('')
    setFilterFrom('')
    setFilterTo('')
    setPage(1)
  }

  function handleFilterChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value)
      setPage(1)
    }
  }

  function handleExport() {
    const qs = new URLSearchParams()
    if (filterAction) qs.set('action', filterAction)
    if (filterEntite) qs.set('entite', filterEntite)
    if (filterFrom) qs.set('from', filterFrom)
    if (filterTo) qs.set('to', filterTo)
    qs.set('format', 'csv')
    window.open(`/api/audit?${qs.toString()}`)
  }

  async function handleVerify() {
    setIsVerifying(true)
    try {
      const res = await fetch('/api/audit/verify')
      if (!res.ok) {
        toast.error('Erreur vérification')
        return
      }
      setVerify(await res.json())
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Journal d&apos;audit</h1>
          <p className="text-sm text-zinc-500">
            {total} entrée{total > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleVerify}
            disabled={isVerifying}
            className="gap-1.5"
          >
            <ShieldCheck className="h-4 w-4" />
            Vérifier intégrité
          </Button>
          <Button variant="outline" onClick={handleExport} className="gap-1.5">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {verify && (
        <div
          className={`rounded-lg border p-4 ${verify.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
        >
          <div className="flex items-center gap-2 font-medium">
            {verify.valid ? (
              <>
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <span className="text-green-700">Chaîne d&apos;intégrité valide</span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-4 w-4 text-red-600" />
                <span className="text-red-700">Erreurs détectées</span>
              </>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {verify.nbVentesVerifiees} ventes &middot; {verify.nbCloturesVerifiees} clôtures
            vérifiées
          </p>
          {verify.erreurs.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-sm text-red-600">
              {verify.erreurs.map((e, i) => (
                <li key={i}>• {e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Action…"
          value={filterAction}
          onChange={handleFilterChange(setFilterAction)}
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Entité…"
          value={filterEntite}
          onChange={handleFilterChange(setFilterEntite)}
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
        />
        <input
          type="date"
          value={filterFrom}
          onChange={handleFilterChange(setFilterFrom)}
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
        />
        <input
          type="date"
          value={filterTo}
          onChange={handleFilterChange(setFilterTo)}
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
        />
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          Réinitialiser
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs font-medium tracking-wide text-zinc-500 uppercase">
              <th className="px-4 py-3 text-left">Horodatage</th>
              <th className="px-4 py-3 text-left">Utilisateur</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Entité</th>
              <th className="px-4 py-3 text-left">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-400">
                  {isFetching ? 'Chargement…' : 'Aucun résultat'}
                </td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-zinc-50">
                <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">
                  {new Date(l.timestamp).toLocaleString('fr-FR')}
                </td>
                <td className="px-4 py-2.5 text-zinc-700">
                  {l.userName ?? <span className="text-zinc-300">Système</span>}
                </td>
                <td className="px-4 py-2.5">
                  <Badge
                    variant={ACTION_VARIANTS[l.action] ?? 'secondary'}
                    className="font-mono text-xs"
                  >
                    {l.action}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-zinc-500">
                  {l.entite}
                  {l.entiteId && (
                    <span className="ml-1 font-mono text-xs text-zinc-300">
                      {l.entiteId.slice(0, 8)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{l.ip ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">
            Page {page} / {pages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1 || isFetching}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pages || isFetching}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
