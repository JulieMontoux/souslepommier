'use client'

import { useState, useTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Archive, ChevronRight, Lock } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ClotureSummary, ClotureApercu } from '@/types/cloture'

function fmt(n: number) {
  return n.toFixed(2).replace('.', ',') + ' €'
}

interface ClotureListProps {
  clotures: ClotureSummary[]
  dejaClotureeAujourdhui: boolean
}

export function ClotureList({ clotures, dejaClotureeAujourdhui }: ClotureListProps) {
  const navigate = useNavigate()
  const [isPending, startTransition] = useTransition()
  const [apercu, setApercu] = useState<ClotureApercu | null>(null)
  const [showModal, setShowModal] = useState(false)

  function handleApercu() {
    startTransition(async () => {
      const res = await fetch('/api/clotures/apercu')
      if (res.status === 409) {
        toast.error('Journée déjà clôturée')
        return
      }
      if (!res.ok) {
        toast.error('Erreur lors du chargement')
        return
      }
      const data = await res.json()
      setApercu(data)
      setShowModal(true)
    })
  }

  function handleCloture() {
    startTransition(async () => {
      const res = await fetch('/api/clotures', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error((data as { error?: string }).error ?? 'Erreur')
        return
      }
      setShowModal(false)
      toast.success(`Clôture n°${(data as { numeroCloture: number }).numeroCloture} enregistrée`)
      window.location.reload()
    })
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Clôtures de caisse</h1>
            <p className="text-sm text-zinc-500">
              {clotures.length} clôture{clotures.length > 1 ? 's' : ''}
            </p>
          </div>
          {!dejaClotureeAujourdhui && (
            <Button onClick={handleApercu} disabled={isPending} className="gap-1.5">
              <Lock className="h-4 w-4" />
              Clôturer la journée
            </Button>
          )}
          {dejaClotureeAujourdhui && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              Journée clôturée
            </span>
          )}
        </div>

        {clotures.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center shadow-sm">
            <Archive className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
            <p className="text-sm text-zinc-400">Aucune clôture enregistrée</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  <th className="px-4 py-3 text-left">N°</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Ventes</th>
                  <th className="px-4 py-3 text-right">Total TTC</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {clotures.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-zinc-50">
                    <td className="px-4 py-3 font-mono font-medium text-zinc-800">
                      Z-{String(c.numeroCloture).padStart(4, '0')}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {new Date(c.date).toLocaleDateString('fr-FR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">{c.nbVentes}</td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">
                      {fmt(c.totalTTC)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/dashboard/clotures/${c.id}`}
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

      {showModal && apercu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="border-b border-zinc-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-zinc-900">Aperçu de clôture</h2>
              <p className="text-sm text-zinc-500">
                {new Date(apercu.date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="space-y-1 px-6 py-4">
              <ModalRow label="Ventes finalisées" value={String(apercu.nbVentes)} />
              {apercu.totalEspeces > 0 && (
                <ModalRow label="Espèces (net)" value={fmt(apercu.totalEspeces)} />
              )}
              {apercu.totalCB > 0 && (
                <ModalRow label="Carte bancaire" value={fmt(apercu.totalCB)} />
              )}
              {apercu.totalCheque > 0 && (
                <ModalRow label="Chèque" value={fmt(apercu.totalCheque)} />
              )}
              {apercu.totalVirement > 0 && (
                <ModalRow label="Virement" value={fmt(apercu.totalVirement)} />
              )}
              {apercu.totalTR > 0 && (
                <ModalRow label="Ticket restaurant" value={fmt(apercu.totalTR)} />
              )}
              <div className="border-t border-zinc-100 pt-2">
                <ModalRow label="Total HT" value={fmt(apercu.totalHT)} />
                <ModalRow label="Total TVA" value={fmt(apercu.totalTVA)} />
                <div className="mt-2 flex items-center justify-between rounded-md bg-zinc-900 px-3 py-2">
                  <span className="font-semibold text-white">Total TTC</span>
                  <span className="font-bold text-white">{fmt(apercu.totalTTC)}</span>
                </div>
              </div>
              {apercu.ventesAnnulees.length > 0 && (
                <p className="pt-2 text-sm text-amber-600">
                  ⚠ {apercu.ventesAnnulees.length} vente
                  {apercu.ventesAnnulees.length > 1 ? 's' : ''} annulée
                  {apercu.ventesAnnulees.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-100 px-6 py-4">
              <Button variant="outline" onClick={() => setShowModal(false)} disabled={isPending}>
                Annuler
              </Button>
              <Button onClick={handleCloture} disabled={isPending} className="gap-1.5">
                <Lock className="h-4 w-4" />
                Confirmer la clôture
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ModalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-900">{value}</span>
    </div>
  )
}
