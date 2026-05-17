'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
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

type VerifyResult = {
  valid: boolean
  nbVentesVerifiees: number
  nbCloturesVerifiees: number
  erreurs: string[]
}

export function AuditLog() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [isPending, startTransition] = useTransition()

  const [filterAction, setFilterAction] = useState('')
  const [filterEntite, setFilterEntite] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const [verify, setVerify] = useState<VerifyResult | null>(null)
  const [isVerifying, startVerify] = useTransition()

  const buildQS = useCallback(
    (p = page) => {
      const params = new URLSearchParams()
      if (filterAction) params.set('action', filterAction)
      if (filterEntite) params.set('entite', filterEntite)
      if (filterFrom) params.set('from', filterFrom)
      if (filterTo) params.set('to', filterTo)
      params.set('page', String(p))
      return params.toString()
    },
    [page, filterAction, filterEntite, filterFrom, filterTo]
  )

  const fetchLogs = useCallback(
    (p = 1) => {
      startTransition(async () => {
        const res = await fetch(`/api/audit?${buildQS(p)}`)
        if (!res.ok) {
          toast.error('Erreur chargement logs')
          return
        }
        const data = await res.json()
        setLogs(data.logs)
        setTotal(data.total)
        setPage(data.page)
        setPages(data.pages)
      })
    },
    [buildQS]
  )

  useEffect(() => {
    fetchLogs(1)
  }, [filterAction, filterEntite, filterFrom, filterTo]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleExport() {
    const params = new URLSearchParams()
    if (filterAction) params.set('action', filterAction)
    if (filterEntite) params.set('entite', filterEntite)
    if (filterFrom) params.set('from', filterFrom)
    if (filterTo) params.set('to', filterTo)
    params.set('format', 'csv')
    window.open(`/api/audit?${params.toString()}`)
  }

  function handleVerify() {
    startVerify(async () => {
      const res = await fetch('/api/audit/verify')
      if (!res.ok) {
        toast.error('Erreur vérification')
        return
      }
      setVerify(await res.json())
    })
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

      {/* Résultat vérification */}
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

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Action…"
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Entité…"
          value={filterEntite}
          onChange={(e) => setFilterEntite(e.target.value)}
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
        />
        <input
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
        />
        <input
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setFilterAction('')
            setFilterEntite('')
            setFilterFrom('')
            setFilterTo('')
          }}
        >
          Réinitialiser
        </Button>
        <Button variant="ghost" size="sm" onClick={() => fetchLogs(page)} disabled={isPending}>
          <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Table */}
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
                  {isPending ? 'Chargement…' : 'Aucun résultat'}
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

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">
            Page {page} / {pages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1 || isPending}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= pages || isPending}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
