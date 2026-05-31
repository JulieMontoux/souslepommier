'use client'

import { useTransition } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Download, CheckCircle, Truck, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BLDetail, StatutBL } from '@/types/bon-livraison'

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

function fmt(n: number) {
  return n.toFixed(2).replace('.', ',') + ' €'
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR')
}

interface BonLivraisonDetailProps {
  bl: BLDetail
}

export function BonLivraisonDetailView({ bl }: BonLivraisonDetailProps) {
  const [isPending, startTransition] = useTransition()

  async function changeStatut(statut: StatutBL) {
    startTransition(async () => {
      const res = await fetch(`/api/bons-livraison/${bl.id}/statut`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { error?: string }).error ?? 'Erreur')
        return
      }
      toast.success('Statut mis à jour')
      window.location.reload()
    })
  }

  const totalHTBrut = bl.lignes.reduce((s, l) => s + l.montantHT, 0)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/bons-livraison"
            className={buttonVariants({ variant: 'ghost', size: 'icon' })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-xl font-bold text-zinc-900">{bl.numero}</h1>
              <Badge variant={STATUT_VARIANTS[bl.statut] ?? 'secondary'}>
                {STATUT_LABELS[bl.statut] ?? bl.statut}
              </Badge>
            </div>
            <p className="text-sm text-zinc-500">
              Émis le {fmtDate(bl.dateEmission)}
              {bl.dateLivraison && ` · Livraison ${fmtDate(bl.dateLivraison)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/bons-livraison/${bl.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </a>
          {bl.statut === 'BROUILLON' && (
            <Button
              size="sm"
              onClick={() => changeStatut('EMIS')}
              disabled={isPending}
              className="gap-1.5"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Émettre
            </Button>
          )}
          {bl.statut === 'EMIS' && (
            <>
              <Button
                size="sm"
                onClick={() => changeStatut('LIVRE')}
                disabled={isPending}
                className="gap-1.5"
              >
                <Truck className="h-3.5 w-3.5" />
                Marquer livré
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => changeStatut('ANNULE')}
                disabled={isPending}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Annuler
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Client</p>
          <p className="font-semibold text-zinc-900">{bl.client.raisonSociale}</p>
          {bl.client.adresse && <p className="text-sm text-zinc-500">{bl.client.adresse}</p>}
          {(bl.client.codePostal || bl.client.ville) && (
            <p className="text-sm text-zinc-500">
              {[bl.client.codePostal, bl.client.ville].filter(Boolean).join(' ')}
            </p>
          )}
          {bl.client.siret && (
            <p className="mt-1 text-xs text-zinc-400">SIRET : {bl.client.siret}</p>
          )}
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Dates</p>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Émission</dt>
              <dd className="text-zinc-800">{fmtDate(bl.dateEmission)}</dd>
            </div>
            {bl.dateLivraison && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Livraison</dt>
                <dd className="text-zinc-800">{fmtDate(bl.dateLivraison)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Lines */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs font-medium tracking-wide text-zinc-500 uppercase">
              <th className="px-5 py-3 text-left">Désignation</th>
              <th className="px-5 py-3 text-right">Qté</th>
              <th className="px-5 py-3 text-right">Unité</th>
              <th className="px-5 py-3 text-right">PU HT</th>
              <th className="px-5 py-3 text-right">Total HT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {bl.lignes.map((l) => (
              <tr key={l.id}>
                <td className="px-5 py-3 text-zinc-800">
                  {l.designation}
                  {l.remise > 0 && <span className="ml-2 text-xs text-zinc-400">-{l.remise}%</span>}
                </td>
                <td className="px-5 py-3 text-right text-zinc-600">
                  {Number(l.qte) % 1 === 0 ? l.qte : Number(l.qte).toFixed(3).replace('.', ',')}
                </td>
                <td className="px-5 py-3 text-right text-zinc-400">{l.unite ?? '—'}</td>
                <td className="px-5 py-3 text-right text-zinc-600">
                  {l.prixUnitaireHT.toFixed(2).replace('.', ',')}
                </td>
                <td className="px-5 py-3 text-right font-medium text-zinc-900">
                  {fmt(l.montantHT)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end border-t border-zinc-100 px-5 py-4">
          <div className="w-52 space-y-1">
            {bl.remiseCommerciale ? (
              <>
                <div className="flex justify-between text-sm text-zinc-500">
                  <span>Total brut HT</span>
                  <span>{fmt(totalHTBrut)}</span>
                </div>
                <div className="flex justify-between text-sm text-zinc-500">
                  <span>Remise {bl.remiseCommerciale}%</span>
                  <span>-{fmt((totalHTBrut * bl.remiseCommerciale) / 100)}</span>
                </div>
              </>
            ) : null}
            <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-bold text-zinc-900">
              <span>TOTAL HT</span>
              <span>{fmt(bl.totalHT)}</span>
            </div>
          </div>
        </div>
      </div>

      {bl.notes && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="mb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Notes</p>
          <p className="text-sm whitespace-pre-wrap text-zinc-700">{bl.notes}</p>
        </div>
      )}
    </div>
  )
}
