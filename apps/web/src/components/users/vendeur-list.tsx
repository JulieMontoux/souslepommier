'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Users, Plus, ChevronRight, CheckCircle, XCircle } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { UserSummary } from '@/types/user'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface VendeurListProps {
  users: UserSummary[]
}

export function VendeurList({ users }: VendeurListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState<{
    prenom: string
    nom: string
    email: string
    role: 'VENDEUR' | 'GERANT'
  }>({ prenom: '', nom: '', email: '', role: 'VENDEUR' })
  const [confirmDesactiver, setConfirmDesactiver] = useState<UserSummary | null>(null)

  function handleToggle(user: UserSummary) {
    if (user.actif) {
      setConfirmDesactiver(user)
    } else {
      doToggle(user.id, true)
    }
  }

  function doToggle(id: string, actif: boolean) {
    startTransition(async () => {
      const res = await fetch(`/api/users/${id}/statut`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { error?: string }).error ?? 'Erreur')
        return
      }
      toast.success(actif ? 'Vendeur activé' : 'Vendeur désactivé')
      setConfirmDesactiver(null)
      router.refresh()
    })
  }

  function handleAdd() {
    startTransition(async () => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error((data as { error?: string }).error ?? 'Erreur')
        return
      }
      toast.success(`Compte créé — email envoyé à ${form.email}`)
      setShowAddModal(false)
      setForm({ prenom: '', nom: '', email: '', role: 'VENDEUR' })
      router.refresh()
    })
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Vendeurs</h1>
            <p className="text-sm text-zinc-500">
              {users.length} utilisateur{users.length > 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Ajouter un vendeur
          </Button>
        </div>

        {users.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center shadow-sm">
            <Users className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
            <p className="text-sm text-zinc-400">Aucun utilisateur</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  <th className="px-4 py-3 text-left">Nom</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Rôle</th>
                  <th className="px-4 py-3 text-right">Ventes / mois</th>
                  <th className="px-4 py-3 text-left">Dernière connexion</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {u.prenom} {u.nom}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role === 'GERANT' ? 'default' : 'secondary'}>
                        {u.role === 'GERANT' ? 'Gérant' : 'Vendeur'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">{u.nbVentesMois}</td>
                    <td className="px-4 py-3 text-zinc-500">{fmtDate(u.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(u)}
                        disabled={isPending}
                        className="flex items-center gap-1.5 text-sm"
                      >
                        {u.actif ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-green-700">Actif</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-zinc-400" />
                            <span className="text-zinc-400">Inactif</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/vendeurs/${u.id}`}
                        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1')}
                      >
                        Voir
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal ajout vendeur */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b border-zinc-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-zinc-900">Ajouter un vendeur</h2>
              <p className="text-sm text-zinc-500">
                Un email avec les identifiants sera envoyé automatiquement.
              </p>
            </div>
            <div className="space-y-3 px-6 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">Prénom</label>
                  <input
                    type="text"
                    value={form.prenom}
                    onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                    className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">Nom</label>
                  <input
                    type="text"
                    value={form.nom}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Rôle</label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value as 'VENDEUR' | 'GERANT' }))
                  }
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                >
                  <option value="VENDEUR">Vendeur</option>
                  <option value="GERANT">Gérant</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-100 px-6 py-4">
              <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={isPending}>
                Annuler
              </Button>
              <Button
                onClick={handleAdd}
                disabled={isPending || !form.prenom || !form.nom || !form.email}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Créer le compte
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation désactivation */}
      {confirmDesactiver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="px-6 py-5">
              <h2 className="text-lg font-semibold text-zinc-900">Désactiver le compte ?</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {confirmDesactiver.prenom} {confirmDesactiver.nom} ne pourra plus se connecter.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-100 px-6 py-4">
              <Button
                variant="outline"
                onClick={() => setConfirmDesactiver(null)}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={() => doToggle(confirmDesactiver.id, false)}
                disabled={isPending}
              >
                Désactiver
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
