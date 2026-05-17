'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Download, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TYPE_LABELS, STATUT_LABELS, type DemandeRGPD, type StatutDemandeRGPD } from '@/types/rgpd'

const STATUT_VARIANT: Record<StatutDemandeRGPD, 'default' | 'secondary' | 'destructive'> = {
  EN_ATTENTE: 'destructive',
  EN_COURS: 'secondary',
  TRAITEE: 'default',
  REFUSEE: 'secondary',
}

function ProcessModal({
  demande,
  onClose,
  onDone,
}: {
  demande: DemandeRGPD
  onClose: () => void
  onDone: (updated: DemandeRGPD) => void
}) {
  const [statut, setStatut] = useState<'EN_COURS' | 'TRAITEE' | 'REFUSEE'>('TRAITEE')
  const [reponse, setReponse] = useState('')
  const [isPending, start] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      const res = await fetch(`/api/rgpd/demandes/${demande.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut, reponse: reponse || undefined }),
      })
      if (!res.ok) {
        toast.error('Erreur')
        return
      }
      const updated: DemandeRGPD = await res.json()
      onDone(updated)
      toast.success('Demande mise à jour')
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl"
      >
        <h3 className="font-semibold text-zinc-900">Traiter la demande</h3>
        <div className="space-y-1 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">
          <p>
            <strong>Type :</strong> {TYPE_LABELS[demande.type]}
          </p>
          <p>
            <strong>Demandeur :</strong> {demande.nom} ({demande.email})
          </p>
          {demande.message && (
            <p>
              <strong>Message :</strong> {demande.message}
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Nouveau statut</label>
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value as typeof statut)}
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
          >
            <option value="EN_COURS">En cours de traitement</option>
            <option value="TRAITEE">Traitée</option>
            <option value="REFUSEE">Refusée</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Réponse <span className="text-zinc-400">(facultatif)</span>
          </label>
          <textarea
            value={reponse}
            onChange={(e) => setReponse(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending} size="sm">
            Enregistrer
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </Button>
        </div>
      </form>
    </div>
  )
}

export function DemandesAdmin({
  initial,
  users,
}: {
  initial: DemandeRGPD[]
  users: { id: string; nom: string; prenom: string; email: string }[]
}) {
  const [demandes, setDemandes] = useState<DemandeRGPD[]>(initial)
  const [processing, setProcessing] = useState<DemandeRGPD | null>(null)
  const [filterStatut, setFilterStatut] = useState<StatutDemandeRGPD | ''>('')

  const now = new Date().getTime()
  const filtered = filterStatut ? demandes.filter((d) => d.statut === filterStatut) : demandes
  const pending = demandes.filter((d) => d.statut === 'EN_ATTENTE').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Demandes RGPD</h1>
          {pending > 0 && (
            <p className="text-sm font-medium text-red-600">
              {pending} demande{pending > 1 ? 's' : ''} en attente
            </p>
          )}
        </div>
      </div>

      {/* Export données utilisateur */}
      {users.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 font-medium text-zinc-800">
            Export données utilisateur (portabilité)
          </h2>
          <div className="flex flex-wrap gap-2">
            {users.map((u) => (
              <a
                key={u.id}
                href={`/api/rgpd/export/${u.id}`}
                download
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <Download className="h-3.5 w-3.5" />
                {u.prenom} {u.nom}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {(['', 'EN_ATTENTE', 'EN_COURS', 'TRAITEE', 'REFUSEE'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatut(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filterStatut === s
                ? 'bg-zinc-800 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {s === '' ? 'Toutes' : STATUT_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs font-medium tracking-wide text-zinc-500 uppercase">
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Demandeur</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 text-left">Délai</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-400">
                  Aucune demande
                </td>
              </tr>
            )}
            {filtered.map((d) => {
              const age = Math.floor(
                (now - new Date(d.createdAt).getTime()) / (1000 * 60 * 60 * 24)
              )
              const overdue = age > 30 && d.statut !== 'TRAITEE' && d.statut !== 'REFUSEE'
              return (
                <tr key={d.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">
                    {new Date(d.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-zinc-800">{d.nom}</p>
                    <p className="text-xs text-zinc-400">{d.email}</p>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600">{TYPE_LABELS[d.type]}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={STATUT_VARIANT[d.statut]}>{STATUT_LABELS[d.statut]}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`flex items-center gap-1 text-xs ${overdue ? 'font-medium text-red-600' : 'text-zinc-400'}`}
                    >
                      {d.statut === 'TRAITEE' || d.statut === 'REFUSEE' ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Terminée
                        </>
                      ) : overdue ? (
                        <>
                          <XCircle className="h-3.5 w-3.5" /> {age}j — DÉPASSÉ
                        </>
                      ) : (
                        <>
                          <Clock className="h-3.5 w-3.5" /> J+{age} / 30
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {(d.statut === 'EN_ATTENTE' || d.statut === 'EN_COURS') && (
                      <Button variant="outline" size="sm" onClick={() => setProcessing(d)}>
                        Traiter
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {processing && (
        <ProcessModal
          demande={processing}
          onClose={() => setProcessing(null)}
          onDone={(updated) => {
            setDemandes((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
            setProcessing(null)
          }}
        />
      )}
    </div>
  )
}
