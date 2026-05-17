'use client'

import { useState, useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { roundFiscal } from '@/lib/tva'

type ModeReglement = 'ESPECES' | 'CB' | 'CHEQUE' | 'VIREMENT' | 'TICKET_RESTO'

export type PaiementInput = {
  mode: ModeReglement
  montant: number
  reference?: string
}

const MODE_CONFIG: Record<
  ModeReglement,
  { label: string; emoji: string; hasReference: boolean; referencePlaceholder?: string }
> = {
  ESPECES: { label: 'Espèces', emoji: '💵', hasReference: false },
  CB: { label: 'Carte bancaire', emoji: '💳', hasReference: false },
  CHEQUE: { label: 'Chèque', emoji: '📝', hasReference: true, referencePlaceholder: 'N° chèque' },
  VIREMENT: {
    label: 'Virement',
    emoji: '🔄',
    hasReference: true,
    referencePlaceholder: 'Référence',
  },
  TICKET_RESTO: {
    label: 'Ticket resto',
    emoji: '🎟',
    hasReference: true,
    referencePlaceholder: 'Swile, Edenred…',
  },
}

const MODES = Object.keys(MODE_CONFIG) as ModeReglement[]

type LignePaiement = {
  id: string
  mode: ModeReglement
  montant: string
  reference: string
}

interface PaiementModalProps {
  totalTTC: number
  onConfirm: (paiements: PaiementInput[]) => void
  onClose: () => void
  saving: boolean
}

export function PaiementModal({ totalTTC, onConfirm, onClose, saving }: PaiementModalProps) {
  const [lignes, setLignes] = useState<LignePaiement[]>([])

  const totalSaisi = useMemo(
    () => roundFiscal(lignes.reduce((s, l) => s + (parseFloat(l.montant) || 0), 0)),
    [lignes]
  )
  const resteAPayer = roundFiscal(totalTTC - totalSaisi)
  const peutValider = resteAPayer <= 0.005 && lignes.length > 0
  const rendMonnaie = totalSaisi > totalTTC + 0.005 ? roundFiscal(totalSaisi - totalTTC) : 0

  function addMode(mode: ModeReglement) {
    if (lignes.some((l) => l.mode === mode)) return
    const reste = Math.max(0, roundFiscal(totalTTC - totalSaisi))
    setLignes((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        mode,
        montant: reste > 0 ? reste.toFixed(2) : '',
        reference: '',
      },
    ])
  }

  function updateMontant(id: string, value: string) {
    setLignes((prev) => prev.map((l) => (l.id === id ? { ...l, montant: value } : l)))
  }

  function updateReference(id: string, value: string) {
    setLignes((prev) => prev.map((l) => (l.id === id ? { ...l, reference: value } : l)))
  }

  function removeLigne(id: string) {
    setLignes((prev) => prev.filter((l) => l.id !== id))
  }

  function handleConfirm() {
    if (!peutValider || saving) return
    const paiements: PaiementInput[] = lignes
      .map((l) => ({
        mode: l.mode,
        montant: parseFloat(l.montant),
        ...(l.reference ? { reference: l.reference } : {}),
      }))
      .filter((p) => p.montant > 0)
    onConfirm(paiements)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-xl bg-white p-6 shadow-xl">
        {/* Total */}
        <div className="text-center">
          <p className="text-sm text-zinc-500">À régler</p>
          <p className="text-5xl font-bold text-zinc-900 tabular-nums">
            {totalTTC.toFixed(2).replace('.', ',')} €
          </p>
        </div>

        {/* Mode buttons */}
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-zinc-400 uppercase">
            Mode de paiement
          </p>
          <div className="flex flex-wrap gap-2">
            {MODES.map((mode) => {
              const already = lignes.some((l) => l.mode === mode)
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => addMode(mode)}
                  disabled={already}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    already
                      ? 'cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300'
                      : 'cursor-pointer border-zinc-200 bg-white text-zinc-700 hover:border-green-400 hover:text-green-700'
                  }`}
                >
                  <span>{MODE_CONFIG[mode].emoji}</span>
                  {MODE_CONFIG[mode].label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Lignes saisies */}
        {lignes.length > 0 && (
          <div className="space-y-3">
            {lignes.map((ligne, i) => {
              const cfg = MODE_CONFIG[ligne.mode]
              const isLast = i === lignes.length - 1
              return (
                <div key={ligne.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cfg.emoji}</span>
                    <span className="flex-1 text-sm font-medium text-zinc-700">{cfg.label}</span>
                    <div className="relative w-32">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={ligne.montant}
                        onChange={(e) => updateMontant(ligne.id, e.target.value)}
                        className="pr-6 text-right font-mono tabular-nums"
                        autoFocus={isLast}
                      />
                      <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-zinc-400">
                        €
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLigne(ligne.id)}
                      className="text-zinc-300 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {cfg.hasReference && (
                    <div className="mt-2 pl-8">
                      <Input
                        placeholder={cfg.referencePlaceholder}
                        value={ligne.reference}
                        onChange={(e) => updateReference(ligne.id, e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Récap */}
        {lignes.length > 0 && (
          <div className="space-y-2 rounded-lg bg-zinc-50 px-4 py-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Total saisi</span>
              <span className="font-mono font-medium tabular-nums">
                {totalSaisi.toFixed(2).replace('.', ',')} €
              </span>
            </div>
            <div
              className={`flex justify-between text-base font-bold ${
                resteAPayer > 0.005 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              <span>Reste à payer</span>
              <span className="font-mono tabular-nums">
                {Math.max(0, resteAPayer).toFixed(2).replace('.', ',')} €
              </span>
            </div>
            {rendMonnaie > 0 && (
              <div className="flex items-center justify-between rounded-md bg-green-50 px-3 py-2">
                <span className="text-sm font-medium text-green-700">Rendu monnaie</span>
                <span className="font-mono text-2xl font-bold text-green-700 tabular-nums">
                  {rendMonnaie.toFixed(2).replace('.', ',')} €
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button
            className="h-12 flex-1 text-base font-bold"
            disabled={!peutValider || saving}
            onClick={handleConfirm}
          >
            {saving ? 'Enregistrement…' : '✓ Encaisser'}
          </Button>
        </div>
      </div>
    </div>
  )
}
