'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, ToggleLeft, ToggleRight, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { TauxTVA } from '@/types/taux-tva'

type FormState = {
  libelle: string
  taux: string
  defaut: boolean
  dateEffet: string
}

const EMPTY: FormState = { libelle: '', taux: '', defaut: false, dateEffet: '' }

export function TvaConfig({ initial }: { initial: TauxTVA[] }) {
  const [rows, setRows] = useState<TauxTVA[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<TauxTVA | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [isPending, start] = useTransition()

  function openEdit(row: TauxTVA) {
    setEditing(row)
    setForm({
      libelle: row.libelle,
      taux: String(row.taux),
      defaut: row.defaut,
      dateEffet: row.dateEffet.slice(0, 10),
    })
    setShowForm(false)
  }

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const tauxNum = parseFloat(form.taux)
    if (isNaN(tauxNum) || tauxNum < 0 || tauxNum > 100) {
      toast.error('Taux invalide (0–100)')
      return
    }

    const body = {
      libelle: form.libelle,
      taux: tauxNum,
      defaut: form.defaut,
      dateEffet: form.dateEffet || undefined,
    }

    start(async () => {
      const res = editing
        ? await fetch(`/api/taux-tva/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/taux-tva', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? 'Erreur')
        return
      }

      const saved: TauxTVA = await res.json()

      if (editing) {
        setRows((prev) =>
          prev.map((r) => {
            if (saved.defaut && r.id !== saved.id) return { ...r, defaut: false }
            return r.id === saved.id ? saved : r
          })
        )
        toast.success('Taux mis à jour')
      } else {
        setRows((prev) => {
          const updated = saved.defaut ? prev.map((r) => ({ ...r, defaut: false })) : prev
          return [...updated, saved].sort((a, b) => {
            if (a.actif !== b.actif) return a.actif ? -1 : 1
            return a.taux - b.taux
          })
        })
        toast.success('Taux créé')
      }

      closeForm()
    })
  }

  function handleToggle(row: TauxTVA) {
    start(async () => {
      const res = await fetch(`/api/taux-tva/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: !row.actif }),
      })
      if (!res.ok) {
        toast.error('Erreur')
        return
      }
      const updated: TauxTVA = await res.json()
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      toast.success(updated.actif ? 'Taux activé' : 'Taux désactivé')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Taux de TVA</h2>
          <p className="text-sm text-zinc-500">Taux applicables aux ventes et factures</p>
        </div>
        <Button onClick={openNew} className="gap-1.5" disabled={isPending}>
          <Plus className="h-4 w-4" />
          Nouveau taux
        </Button>
      </div>

      {/* Form */}
      {(showForm || editing) && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
        >
          <h3 className="font-medium text-zinc-800">
            {editing ? 'Modifier le taux' : 'Nouveau taux de TVA'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Libellé</label>
              <input
                required
                value={form.libelle}
                onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))}
                placeholder="Ex: TVA alimentaire réduite"
                className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Taux (%)</label>
              <input
                required
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={form.taux}
                onChange={(e) => setForm((f) => ({ ...f, taux: e.target.value }))}
                placeholder="5.5"
                className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">
                Date d&apos;effet
              </label>
              <input
                type="date"
                value={form.dateEffet}
                onChange={(e) => setForm((f) => ({ ...f, dateEffet: e.target.value }))}
                className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.defaut}
                  onChange={(e) => setForm((f) => ({ ...f, defaut: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                <span className="text-sm text-zinc-700">Taux par défaut</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending} size="sm">
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={closeForm}>
              Annuler
            </Button>
          </div>
        </form>
      )}

      {/* Info fiscale */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
        <strong>Taux France 2026 :</strong> Fruits &amp; légumes frais → 5,5 % · Produits
        transformés → 20 % · Franchise TVA (si applicable) → 0 %
        <br />
        Calcul : TVA = prix HT × taux. Arrondi fiscal français (2 décimales).
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs font-medium tracking-wide text-zinc-500 uppercase">
              <th className="px-4 py-3 text-left">Libellé</th>
              <th className="px-4 py-3 text-right">Taux</th>
              <th className="px-4 py-3 text-left">Date d&apos;effet</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-400">
                  Aucun taux configuré
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium text-zinc-800">
                  <span className="flex items-center gap-1.5">
                    {row.defaut && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                    {row.libelle}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-700">
                  {Number(row.taux).toFixed(1)} %
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(row.dateEffet).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={row.actif ? 'default' : 'secondary'}>
                    {row.actif ? 'Actif' : 'Inactif'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => openEdit(row)}
                      title="Modifier"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleToggle(row)}
                      disabled={isPending}
                      title={row.actif ? 'Désactiver' : 'Activer'}
                    >
                      {row.actif ? (
                        <ToggleRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-zinc-400" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
