'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, Shield } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ClotureDetail } from '@/types/cloture'

function fmt(n: number) {
  return n.toFixed(2).replace('.', ',') + ' €'
}

interface ClotureDetailViewProps {
  cloture: ClotureDetail
}

export function ClotureDetailView({ cloture }: ClotureDetailViewProps) {
  const dateStr = new Date(cloture.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const heureStr = new Date(cloture.createdAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard/clotures"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-2 -ml-2 gap-1')}
          >
            <ArrowLeft className="h-4 w-4" />
            Clôtures
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900">
            Z-{String(cloture.numeroCloture).padStart(4, '0')}
          </h1>
          <p className="text-sm text-zinc-500">
            {dateStr} — Clôturée à {heureStr} par {cloture.gerantPrenom} {cloture.gerantNom}
          </p>
        </div>
        <a
          href={`/api/clotures/${cloture.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}
        >
          <Download className="h-4 w-4" />
          Télécharger PDF
        </a>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Section title="Modes de paiement">
            {[
              { label: 'Espèces (net)', value: cloture.totalEspeces },
              { label: 'Carte bancaire', value: cloture.totalCB },
              { label: 'Chèque', value: cloture.totalCheque },
              { label: 'Virement', value: cloture.totalVirement },
              { label: 'Ticket restaurant', value: cloture.totalTR },
            ]
              .filter((r) => r.value > 0)
              .map((r) => (
                <Row key={r.label} label={r.label} value={fmt(r.value)} />
              ))}
          </Section>

          <Section title="Totaux">
            <Row label="Ventes finalisées" value={String(cloture.nbVentes)} />
            <Row label="Total HT" value={fmt(cloture.totalHT)} />
            <Row label="Total TVA" value={fmt(cloture.totalTVA)} />
            <div className="mt-2 flex items-center justify-between rounded-md bg-zinc-900 px-3 py-2">
              <span className="text-sm font-semibold text-white">Total TTC</span>
              <span className="font-bold text-white">{fmt(cloture.totalTTC)}</span>
            </div>
          </Section>

          {cloture.recapTVA.length > 0 && (
            <Section title="Récapitulatif TVA">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-400">
                    <th className="pb-1 text-left font-medium">Taux</th>
                    <th className="pb-1 text-right font-medium">Base HT</th>
                    <th className="pb-1 text-right font-medium">TVA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {cloture.recapTVA.map((t) => (
                    <tr key={t.taux}>
                      <td className="py-1 text-zinc-600">{t.taux}%</td>
                      <td className="py-1 text-right text-zinc-700">{fmt(t.baseHT)}</td>
                      <td className="py-1 text-right font-medium text-zinc-900">
                        {fmt(t.montantTVA)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          {cloture.recapVendeurs.length > 0 && (
            <Section title="Par vendeur">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-400">
                    <th className="pb-1 text-left font-medium">Vendeur</th>
                    <th className="pb-1 text-right font-medium">Ventes</th>
                    <th className="pb-1 text-right font-medium">CA HT</th>
                    <th className="pb-1 text-right font-medium">CA TTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {cloture.recapVendeurs.map((v) => (
                    <tr key={v.vendeurId}>
                      <td className="py-1.5 text-zinc-700">
                        {v.prenom} {v.nom}
                      </td>
                      <td className="py-1.5 text-right text-zinc-600">{v.nbVentes}</td>
                      <td className="py-1.5 text-right text-zinc-700">{fmt(v.totalHT)}</td>
                      <td className="py-1.5 text-right font-medium text-zinc-900">
                        {fmt(v.totalTTC)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {cloture.recapProduits.length > 0 && (
            <Section title="Top produits">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-400">
                    <th className="pb-1 text-left font-medium">Produit</th>
                    <th className="pb-1 text-right font-medium">Qté</th>
                    <th className="pb-1 text-right font-medium">CA HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {cloture.recapProduits.map((p) => (
                    <tr key={p.produitId}>
                      <td className="py-1.5 text-zinc-700">{p.nom}</td>
                      <td className="py-1.5 text-right text-zinc-600">
                        {p.qteTotal % 1 === 0
                          ? p.qteTotal
                          : p.qteTotal.toFixed(3).replace('.', ',')}
                      </td>
                      <td className="py-1.5 text-right font-medium text-zinc-900">
                        {fmt(p.montantHT)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {cloture.ventesAnnulees.length > 0 && (
            <Section title={`Ventes annulées (${cloture.ventesAnnulees.length})`}>
              <div className="space-y-1.5">
                {cloture.ventesAnnulees.map((v) => (
                  <div key={v.numero} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-mono text-zinc-700">{v.numero}</span>
                      <span className="ml-2 text-zinc-400">{v.vendeurPrenom}</span>
                      {v.motif && <span className="ml-2 text-zinc-400">— {v.motif}</span>}
                    </div>
                    <span className="font-medium text-red-600">{fmt(v.totalTTC)}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-zinc-400" />
              <span className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
                Signature d&apos;intégrité (HMAC-SHA256)
              </span>
            </div>
            <p className="font-mono text-xs break-all text-zinc-600">{cloture.hashCumulatif}</p>
            <p className="mt-2 text-xs text-zinc-400">
              Clôture n°{cloture.numeroCloture} — Conforme loi anti-fraude TVA 2018 (art. 88)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-xs font-semibold tracking-wide text-zinc-400 uppercase">{title}</h2>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-900">{value}</span>
    </div>
  )
}
