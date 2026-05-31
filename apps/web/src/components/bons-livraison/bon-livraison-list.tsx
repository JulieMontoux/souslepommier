'use client'

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Truck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BLSummary, StatutBL } from '@/types/bon-livraison'

const STATUT_LABELS: Record<StatutBL, string> = {
  BROUILLON: 'Brouillon',
  EMIS: 'Émis',
  LIVRE: 'Livré',
  ANNULE: 'Annulé',
}

const STATUT_VARIANTS: Record<StatutBL, 'default' | 'secondary' | 'destructive'> = {
  BROUILLON: 'secondary',
  EMIS: 'default',
  LIVRE: 'default',
  ANNULE: 'destructive',
}

const STATUTS = ['BROUILLON', 'EMIS', 'LIVRE', 'ANNULE'] as const

interface BonLivraisonListProps {
  bls: BLSummary[]
}

function fmt(n: number) {
  return n.toFixed(2).replace('.', ',') + ' €'
}

export function BonLivraisonList({ bls }: BonLivraisonListProps) {
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<string | null>(null)

  const filtered = bls.filter((bl) => {
    if (filterStatut && bl.statut !== filterStatut) return false
    if (!search) return true
    const q = search.toLowerCase()
    return bl.numero.toLowerCase().includes(q) || bl.clientNom.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Bons de livraison</h1>
          <p className="text-sm text-zinc-500">
            {bls.length} document{bls.length > 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/dashboard/bons-livraison/nouveau" className={cn(buttonVariants(), 'gap-1.5')}>
          <Plus className="h-4 w-4" />
          Nouveau BL
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
          <Truck className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
          <p className="text-sm text-zinc-400">
            {search || filterStatut ? 'Aucun résultat' : 'Aucun bon de livraison'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                <th className="px-4 py-3 text-left">Numéro</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Émission</th>
                <th className="px-4 py-3 text-left">Livraison</th>
                <th className="px-4 py-3 text-right">Total HT</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map((bl) => (
                <tr key={bl.id} className="transition-colors hover:bg-zinc-50">
                  <td className="px-4 py-3 font-mono font-medium text-zinc-800">{bl.numero}</td>
                  <td className="px-4 py-3 text-zinc-700">{bl.clientNom}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(bl.dateEmission).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {bl.dateLivraison ? (
                      new Date(bl.dateLivraison).toLocaleDateString('fr-FR')
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900">
                    {fmt(bl.totalHT)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUT_VARIANTS[bl.statut] ?? 'secondary'}>
                      {STATUT_LABELS[bl.statut] ?? bl.statut}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/dashboard/bons-livraison/${bl.id}`}
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
