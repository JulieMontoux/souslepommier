'use client'

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Building2, Mail, Phone } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ClientComplet } from '@/types/client'

const CONDITIONS_LABELS: Record<number, string> = {
  0: 'Comptant',
  30: '30 j',
  45: '45 j',
  60: '60 j',
}

interface ClientListProps {
  clients: ClientComplet[]
}

export function ClientList({ clients }: ClientListProps) {
  const [search, setSearch] = useState('')

  const filtered = clients.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.raisonSociale.toLowerCase().includes(q) ||
      c.siret?.includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.ville?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Clients</h1>
          <p className="text-sm text-zinc-500">
            {clients.length} client{clients.length > 1 ? 's' : ''} professionnel
            {clients.length > 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/dashboard/clients/nouveau" className={cn(buttonVariants(), 'gap-1.5')}>
          <Plus className="h-4 w-4" />
          Nouveau client
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Rechercher par nom, SIRET, email, ville…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center shadow-sm">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
          <p className="text-sm text-zinc-400">
            {search ? 'Aucun client ne correspond à cette recherche' : 'Aucun client enregistré'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                <th className="px-4 py-3 text-left">Raison sociale</th>
                <th className="px-4 py-3 text-left">SIRET</th>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-left">Paiement</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map((client) => (
                <tr key={client.id} className="transition-colors hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{client.raisonSociale}</p>
                    {(client.codePostal || client.ville) && (
                      <p className="text-xs text-zinc-400">
                        {[client.codePostal, client.ville].filter(Boolean).join(' ')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-600">
                    {client.siret ?? <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {client.email && (
                      <p className="flex items-center gap-1 text-zinc-600">
                        <Mail className="h-3 w-3 shrink-0" />
                        {client.email}
                      </p>
                    )}
                    {client.telephone && (
                      <p className="flex items-center gap-1 text-zinc-400">
                        <Phone className="h-3 w-3 shrink-0" />
                        {client.telephone}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {CONDITIONS_LABELS[client.conditionsPaiement] ??
                      `${client.conditionsPaiement} j`}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={client.actif ? 'default' : 'secondary'}>
                      {client.actif ? 'Actif' : 'Inactif'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/dashboard/clients/${client.id}`}
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
