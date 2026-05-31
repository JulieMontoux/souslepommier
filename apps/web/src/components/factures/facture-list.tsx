'use client'

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { FactureSummary } from '@/types/facture'

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  EMISE: 'Émise',
  PAYEE: 'Payée',
  ANNULEE: 'Annulée',
}

const STATUT_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  BROUILLON: 'secondary',
  EMISE: 'default',
  PAYEE: 'default',
  ANNULEE: 'destructive',
}

const STATUTS = ['BROUILLON', 'EMISE', 'PAYEE', 'ANNULEE'] as const

interface FactureListProps {
  factures: FactureSummary[]
}

export function FactureList({ factures }: FactureListProps) {
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<string | null>(null)

  const filtered = factures.filter((f) => {
    if (filterStatut && f.statut !== filterStatut) return false
    if (!search) return true
    const q = search.toLowerCase()
    return f.numero.toLowerCase().includes(q) || f.client.raisonSociale.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Factures</h1>
          <p className="text-sm text-zinc-500">
            {factures.length} document{factures.length > 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/dashboard/factures/nouvelle" className={cn(buttonVariants(), 'gap-1.5')}>
          <Plus className="h-4 w-4" />
          Nouvelle facture
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Rechercher par numéro, client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {STATUTS.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatut(filterStatut === s ? null : s)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                filterStatut === s
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              )}
            >
              {STATUT_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center shadow-sm">
          <FileText className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
          <p className="text-sm text-zinc-400">
            {search || filterStatut ? 'Aucun résultat' : 'Aucune facture'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                <th className="px-4 py-3 text-left">Numéro</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Échéance</th>
                <th className="px-4 py-3 text-right">TTC</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map((f) => (
                <tr key={f.id} className="transition-colors hover:bg-zinc-50">
                  <td className="px-4 py-3 font-mono font-medium text-zinc-800">
                    {f.numero}
                    {f.factureOriginaleId && (
                      <span className="ml-1.5 rounded bg-orange-100 px-1 py-0.5 text-xs text-orange-600">
                        AVOIR
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{f.client.raisonSociale}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(f.dateEmission).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {f.dateEcheance ? (
                      new Date(f.dateEcheance).toLocaleDateString('fr-FR')
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900">
                    {f.totalTTC.toFixed(2).replace('.', ',')} €
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUT_VARIANTS[f.statut] ?? 'secondary'}>
                      {STATUT_LABELS[f.statut] ?? f.statut}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/dashboard/factures/${f.id}`}
                      className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                    >
                      Voir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
