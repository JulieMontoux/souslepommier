'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Download, CheckCircle, AlertTriangle } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { recapTVA } from '@/lib/tva'
import type { FactureDetail } from '@/types/facture'

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

function fmt(n: number) {
  return n.toFixed(2).replace('.', ',') + ' €'
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR')
}

interface FactureDetailProps {
  facture: FactureDetail
  avoirId?: string
}

export function FactureDetailView({ facture, avoirId }: FactureDetailProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAnnulerModal, setShowAnnulerModal] = useState(false)
  const [showPayerModal, setShowPayerModal] = useState(false)
  const [motifAnnulation, setMotifAnnulation] = useState('')
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().slice(0, 10))

  const tvaRecap = recapTVA(
    facture.lignes.map((l) => ({ tauxTVA: l.tauxTVA, montantHT: l.montantHT }))
  )
  const isAvoir = !!facture.factureOriginaleId

  async function handleEmettre() {
    startTransition(async () => {
      const res = await fetch(`/api/factures/${facture.id}/statut`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'EMISE' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { error?: string }).error ?? 'Erreur')
        return
      }
      toast.success('Facture émise')
      router.refresh()
    })
  }

  async function handlePayer() {
    startTransition(async () => {
      const res = await fetch(`/api/factures/${facture.id}/statut`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statut: 'PAYEE',
          datePaiement: new Date(datePaiement).toISOString(),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { error?: string }).error ?? 'Erreur')
        return
      }
      toast.success('Facture marquée comme payée')
      setShowPayerModal(false)
      router.refresh()
    })
  }

  async function handleAnnuler() {
    startTransition(async () => {
      const res = await fetch(`/api/factures/${facture.id}/annuler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motif: motifAnnulation || null }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { error?: string }).error ?? 'Erreur')
        return
      }
      const { avoir } = await res.json()
      toast.success(`Facture annulée — Avoir ${avoir.numero} créé`)
      setShowAnnulerModal(false)
      router.push(`/dashboard/factures/${avoir.id}`)
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/factures"
            className={buttonVariants({ variant: 'ghost', size: 'icon' })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-xl font-bold text-zinc-900">{facture.numero}</h1>
              {isAvoir && (
                <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                  AVOIR
                </span>
              )}
              <Badge variant={STATUT_VARIANTS[facture.statut] ?? 'secondary'}>
                {STATUT_LABELS[facture.statut] ?? facture.statut}
              </Badge>
            </div>
            <p className="text-sm text-zinc-500">
              Émise le {fmtDate(facture.dateEmission)}
              {facture.dateEcheance && ` · Échéance ${fmtDate(facture.dateEcheance)}`}
              {facture.datePaiement && ` · Payée le ${fmtDate(facture.datePaiement)}`}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <a
            href={`/api/factures/${facture.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </a>
          {facture.statut === 'BROUILLON' && (
            <Button size="sm" onClick={handleEmettre} disabled={isPending} className="gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              Émettre
            </Button>
          )}
          {facture.statut === 'EMISE' && !isAvoir && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPayerModal(true)}
                disabled={isPending}
                className="gap-1.5"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Marquer payée
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowAnnulerModal(true)}
                disabled={isPending}
                className="gap-1.5"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Annuler
              </Button>
            </>
          )}
          {avoirId && (
            <Link
              href={`/dashboard/factures/${avoirId}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
            >
              Voir l&apos;avoir
            </Link>
          )}
          {isAvoir && facture.factureOriginaleId && (
            <Link
              href={`/dashboard/factures/${facture.factureOriginaleId}`}
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
            >
              Facture originale
            </Link>
          )}
        </div>
      </div>

      {/* Blocs info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Client</p>
          <p className="font-semibold text-zinc-900">{facture.client.raisonSociale}</p>
          {facture.client.adresse && (
            <p className="text-sm text-zinc-500">{facture.client.adresse}</p>
          )}
          {(facture.client.codePostal || facture.client.ville) && (
            <p className="text-sm text-zinc-500">
              {[facture.client.codePostal, facture.client.ville].filter(Boolean).join(' ')}
            </p>
          )}
          {facture.client.siret && (
            <p className="mt-1 text-xs text-zinc-400">SIRET : {facture.client.siret}</p>
          )}
          {facture.client.tvaIntracommunautaire && (
            <p className="text-xs text-zinc-400">TVA : {facture.client.tvaIntracommunautaire}</p>
          )}
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Dates</p>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Émission</dt>
              <dd className="text-zinc-800">{fmtDate(facture.dateEmission)}</dd>
            </div>
            {facture.dateLivraison && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Prestation</dt>
                <dd className="text-zinc-800">{fmtDate(facture.dateLivraison)}</dd>
              </div>
            )}
            {facture.dateEcheance && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Échéance</dt>
                <dd className="text-zinc-800">{fmtDate(facture.dateEcheance)}</dd>
              </div>
            )}
            {facture.datePaiement && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Paiement</dt>
                <dd className="font-medium text-green-700">{fmtDate(facture.datePaiement)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Lignes */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs font-medium tracking-wide text-zinc-500 uppercase">
              <th className="px-5 py-3 text-left">Désignation</th>
              <th className="px-5 py-3 text-right">Qté</th>
              <th className="px-5 py-3 text-right">PU HT</th>
              <th className="px-5 py-3 text-right">TVA</th>
              <th className="px-5 py-3 text-right">Total HT</th>
              <th className="px-5 py-3 text-right">Total TTC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {facture.lignes.map((l) => (
              <tr key={l.id}>
                <td className="px-5 py-3 text-zinc-800">
                  {l.designation}
                  {l.remise > 0 && <span className="ml-2 text-xs text-zinc-400">-{l.remise}%</span>}
                </td>
                <td className="px-5 py-3 text-right text-zinc-600">{l.qte}</td>
                <td className="px-5 py-3 text-right text-zinc-600">
                  {l.prixUnitaireHT.toFixed(2).replace('.', ',')}
                </td>
                <td className="px-5 py-3 text-right text-zinc-600">{l.tauxTVA}%</td>
                <td className="px-5 py-3 text-right text-zinc-700">
                  {l.montantHT.toFixed(2).replace('.', ',')}
                </td>
                <td className="px-5 py-3 text-right font-medium text-zinc-900">
                  {fmt(l.montantTTC)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TVA recap + totaux */}
        <div className="flex gap-6 border-t border-zinc-100 px-5 py-4">
          <div className="flex-1">
            <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Récapitulatif TVA
            </p>
            {tvaRecap.map((t) => (
              <div key={t.taux} className="flex justify-between text-sm">
                <span className="text-zinc-500">
                  {t.taux}% — base {fmt(t.baseHT)}
                </span>
                <span className="text-zinc-700">{fmt(t.montantTVA)}</span>
              </div>
            ))}
          </div>
          <div className="w-52 space-y-1">
            <div className="flex justify-between text-sm text-zinc-500">
              <span>Total HT</span>
              <span>{fmt(facture.totalHT)}</span>
            </div>
            <div className="flex justify-between text-sm text-zinc-500">
              <span>Total TVA</span>
              <span>{fmt(facture.totalTVA)}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-bold text-zinc-900">
              <span>TOTAL TTC</span>
              <span>{fmt(facture.totalTTC)}</span>
            </div>
          </div>
        </div>
      </div>

      {facture.notes && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="mb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Notes</p>
          <p className="text-sm whitespace-pre-wrap text-zinc-700">{facture.notes}</p>
        </div>
      )}

      {/* Modal payer */}
      {showPayerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 font-semibold text-zinc-900">Marquer comme payée</h2>
            <div className="mb-4 space-y-1.5">
              <label className="text-sm text-zinc-600">Date de paiement</label>
              <input
                type="date"
                value={datePaiement}
                onChange={(e) => setDatePaiement(e.target.value)}
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowPayerModal(false)}>
                Annuler
              </Button>
              <Button onClick={handlePayer} disabled={isPending}>
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal annuler */}
      {showAnnulerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 font-semibold text-zinc-900">Annuler la facture</h2>
            <p className="mb-4 text-sm text-zinc-500">
              Cette action génère un avoir {facture.numero.replace('FAC-', 'AVO-')} de{' '}
              <strong>{fmt(facture.totalTTC)}</strong> et ne peut pas être annulée.
            </p>
            <div className="mb-4 space-y-1.5">
              <label className="text-sm text-zinc-600">Motif (facultatif)</label>
              <textarea
                value={motifAnnulation}
                onChange={(e) => setMotifAnnulation(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowAnnulerModal(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleAnnuler} disabled={isPending}>
                Générer l&apos;avoir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
