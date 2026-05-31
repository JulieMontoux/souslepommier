'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { recapTVA, roundFiscal } from '@/lib/tva'
import type { ConfigTicket } from '@/types/ticket'

const MODE_LABELS: Record<string, string> = {
  ESPECES: 'Espèces',
  CB: 'Carte bancaire',
  CHEQUE: 'Chèque',
  VIREMENT: 'Virement',
  TICKET_RESTO: 'Ticket restaurant',
}

const EMBALLAGE_LABELS: Record<string, string> = {
  VRAC: '',
  BARQUETTE: 'barquette',
  FILET: 'filet',
  SAC: 'sac',
  CAISSE: 'caisse',
  PLATEAU: 'plateau',
}

function fmt(n: number) {
  return n.toFixed(2).replace('.', ',') + ' €'
}

interface TicketModalProps {
  venteId: string
  venteNumero: string
  config: ConfigTicket
  onClose: () => void
}

type VenteDetail = {
  id: string
  numeroTicket: string
  date: string
  totalHT: number | string
  totalTVA: number | string
  totalTTC: number | string
  vendeur: { prenom: string; nom: string }
  lignes: Array<{
    qte: number | string
    prixUnitaireHT: number | string
    tauxTVA: number | string
    montantHT: number | string
    montantTTC: number | string
    remise: number | string
    variante: {
      poids: number | string | null
      emballage: string
      produit: { nom: string }
    }
  }>
  paiements: Array<{
    mode: string
    montant: number | string
    renduMonnaie: number | string
    reference: string | null
  }>
}

export function TicketModal({ venteId, venteNumero, config, onClose }: TicketModalProps) {
  const [vente, setVente] = useState<VenteDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/ventes/${venteId}`)
      .then((r) => r.json())
      .then((data) => {
        setVente(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [venteId])

  function handlePrint() {
    if (!vente) return
    const date = new Date(vente.date)
    const lignesHtml = vente.lignes
      .map((l) => {
        const nom = l.variante.produit.nom
        const poids = l.variante.poids ? `${Number(l.variante.poids)} kg` : ''
        const emb = EMBALLAGE_LABELS[l.variante.emballage] ?? ''
        const designation = [nom, poids, emb].filter(Boolean).join(' ')
        const remise = Number(l.remise)
        const remiseTxt = remise > 0 ? ` -${remise}%` : ''
        return `<div class="ligne"><span>${designation}${remiseTxt}</span><span>${fmt(Number(l.montantTTC))}</span></div>
<div class="ligne-detail">${Number(l.qte)} × ${Number(l.prixUnitaireHT).toFixed(2).replace('.', ',')} € HT (${Number(l.tauxTVA)}%)</div>`
      })
      .join('')

    const tvaHtml = recapTVA(
      vente.lignes.map((l) => ({ tauxTVA: Number(l.tauxTVA), montantHT: Number(l.montantHT) }))
    )
      .map(
        (t) =>
          `<div class="ligne"><span>TVA ${t.taux}%</span><span>${fmt(t.montantTVA)}</span></div>`
      )
      .join('')

    const paiementsHtml = vente.paiements
      .map((p) => {
        let s = `<div class="ligne"><span>${MODE_LABELS[p.mode] ?? p.mode}</span><span>${fmt(Number(p.montant))}</span></div>`
        if (Number(p.renduMonnaie) > 0)
          s += `<div class="ligne bold"><span>Rendu monnaie</span><span>${fmt(Number(p.renduMonnaie))}</span></div>`
        return s
      })
      .join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:monospace;font-size:11px;width:58mm;max-width:58mm;padding:4mm 3mm}
.center{text-align:center}.bold{font-weight:bold}
.sep{border-top:1px dashed #000;margin:4px 0}
.ligne{display:flex;justify-content:space-between;gap:4px}
.ligne-detail{font-size:9px;color:#555;padding-left:4px;margin-bottom:2px}
.total{font-size:13px;font-weight:bold;display:flex;justify-content:space-between}
@media print{@page{margin:0;size:58mm auto}}
</style></head><body>
<div class="center bold">${config?.raisonSociale ?? 'Sous le Pommier'}</div>
${config?.adresse ? `<div class="center">${config.adresse}</div>` : ''}
${config?.codePostal || config?.ville ? `<div class="center">${[config.codePostal, config.ville].filter(Boolean).join(' ')}</div>` : ''}
${config?.telephone ? `<div class="center">Tél. ${config.telephone}</div>` : ''}
${config?.siret ? `<div class="center">SIRET ${config.siret}</div>` : ''}
<div class="sep"></div>
<div class="ligne"><span class="bold">Ticket n°</span><span>${vente.numeroTicket}</span></div>
<div class="ligne"><span>Date</span><span>${date.toLocaleDateString('fr-FR')}</span></div>
<div class="ligne"><span>Heure</span><span>${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></div>
<div class="sep"></div>
${lignesHtml}
<div class="sep"></div>
${tvaHtml}
<div class="sep"></div>
<div class="ligne"><span>Total HT</span><span>${fmt(roundFiscal(Number(vente.totalHT)))}</span></div>
<div class="ligne"><span>Total TVA</span><span>${fmt(roundFiscal(Number(vente.totalTVA)))}</span></div>
<div class="total"><span>TOTAL TTC</span><span>${fmt(roundFiscal(Number(vente.totalTTC)))}</span></div>
<div class="sep"></div>
${paiementsHtml}
<div class="sep"></div>
<div class="center">Merci de votre visite !</div>
<div class="center" style="font-size:9px">Ticket dématérialisé (loi 2023)</div>
</body></html>`

    const w = window.open('', '_blank', 'width=300,height=600')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
    w.onafterprint = () => w.close()
  }

  const date = vente ? new Date(vente.date) : null

  const lignes =
    vente?.lignes.map((l) => {
      const nom = l.variante.produit.nom
      const poids = l.variante.poids ? `${Number(l.variante.poids)} kg` : ''
      const emb = EMBALLAGE_LABELS[l.variante.emballage] ?? ''
      const designation = [nom, poids, emb].filter(Boolean).join(' ')
      return {
        designation,
        qte: Number(l.qte),
        prixUnitaireHT: Number(l.prixUnitaireHT),
        tauxTVA: Number(l.tauxTVA),
        montantHT: Number(l.montantHT),
        montantTTC: Number(l.montantTTC),
        remise: Number(l.remise),
      }
    }) ?? []

  const tvaRecap = recapTVA(lignes.map((l) => ({ tauxTVA: l.tauxTVA, montantHT: l.montantHT })))
  const totalHT = vente ? roundFiscal(Number(vente.totalHT)) : 0
  const totalTVA = vente ? roundFiscal(Number(vente.totalTVA)) : 0
  const totalTTC = vente ? roundFiscal(Number(vente.totalTTC)) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-sm flex-col rounded-xl bg-white shadow-xl">
        {/* Actions */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <span className="font-semibold text-zinc-800">Ticket {venteNumero}</span>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              disabled={loading || !vente}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-40"
            >
              Imprimer
            </button>
            <a
              href={`/api/ventes/${venteId}/ticket`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
            >
              PDF A4
            </a>
            <Button onClick={onClose} className="h-8">
              ✓ Nouvelle vente
            </Button>
          </div>
        </div>

        {/* Ticket scroll */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="py-12 text-center text-sm text-zinc-400">Chargement…</p>
          ) : !vente ? (
            <p className="py-12 text-center text-sm text-red-400">Erreur chargement ticket</p>
          ) : (
            <div className="px-6 py-4 font-mono text-xs">
              {/* En-tête */}
              <div className="text-center">
                <p className="text-sm font-bold">{config?.raisonSociale ?? 'Sous le Pommier'}</p>
                {config?.adresse && <p className="text-zinc-500">{config.adresse}</p>}
                {(config?.codePostal || config?.ville) && (
                  <p className="text-zinc-500">
                    {[config.codePostal, config.ville].filter(Boolean).join(' ')}
                  </p>
                )}
                {config?.telephone && <p className="text-zinc-500">Tél. {config.telephone}</p>}
                {config?.siret && <p className="text-zinc-500">SIRET : {config.siret}</p>}
                {config?.tvaIntracommunautaire && (
                  <p className="text-zinc-500">TVA : {config.tvaIntracommunautaire}</p>
                )}
              </div>

              <div className="my-3 border-t border-dashed border-zinc-300" />

              {/* Infos */}
              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span className="font-bold">Ticket n°</span>
                  <span>{vente.numeroTicket}</span>
                </div>
                {date && (
                  <>
                    <div className="flex justify-between">
                      <span>Date</span>
                      <span>{date.toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Heure</span>
                      <span>
                        {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span>Vendeur</span>
                  <span>{vente.vendeur.prenom}</span>
                </div>
              </div>

              <div className="my-3 border-t border-dashed border-zinc-300" />

              {/* Articles */}
              <p className="mb-1 font-bold tracking-wide uppercase">Articles</p>
              <div className="space-y-1">
                {lignes.map((l, i) => (
                  <div key={i}>
                    <p className="truncate">{l.designation}</p>
                    <div className="flex justify-between text-zinc-500">
                      <span>
                        {l.qte} × {l.prixUnitaireHT.toFixed(2).replace('.', ',')} € HT
                        {l.tauxTVA > 0 ? ` (${l.tauxTVA}% TVA)` : ' (exonéré)'}
                        {l.remise > 0 ? ` -${l.remise}%` : ''}
                      </span>
                      <span className="font-medium text-zinc-800">{fmt(l.montantTTC)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="my-3 border-t border-dashed border-zinc-300" />

              {/* TVA */}
              <p className="mb-1 font-bold tracking-wide uppercase">Récapitulatif TVA</p>
              {tvaRecap.map((t) => (
                <div key={t.taux} className="flex justify-between">
                  <span>
                    {t.taux}% — base {fmt(t.baseHT)}
                  </span>
                  <span>{fmt(t.montantTVA)}</span>
                </div>
              ))}

              <div className="my-3 border-t border-dashed border-zinc-300" />

              {/* Totaux */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-zinc-500">
                  <span>Total HT</span>
                  <span>{fmt(totalHT)}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Total TVA</span>
                  <span>{fmt(totalTVA)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span>TOTAL TTC</span>
                  <span>{fmt(totalTTC)}</span>
                </div>
              </div>

              <div className="my-3 border-t border-dashed border-zinc-300" />

              {/* Paiements */}
              <p className="mb-1 font-bold tracking-wide uppercase">Règlement</p>
              {vente.paiements.map((p, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span>{MODE_LABELS[p.mode] ?? p.mode}</span>
                    <span>{fmt(Number(p.montant))}</span>
                  </div>
                  {p.reference && <p className="pl-2 text-zinc-400">Réf. {p.reference}</p>}
                  {Number(p.renduMonnaie) > 0 && (
                    <div className="flex justify-between font-bold">
                      <span>Rendu monnaie</span>
                      <span>{fmt(Number(p.renduMonnaie))}</span>
                    </div>
                  )}
                </div>
              ))}

              <div className="my-3 border-t border-dashed border-zinc-300" />

              <p className="text-center text-zinc-400">Merci de votre visite !</p>
              <p className="text-center text-zinc-400">Ticket dématérialisé (loi 2023)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
