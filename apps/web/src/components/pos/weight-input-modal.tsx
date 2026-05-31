'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { roundFiscal, calcMontantTVA } from '@/lib/tva'
import type { ProduitPOS, ProduitPOSVariante } from '@/types/pos'

interface WeightInputModalProps {
  produit: ProduitPOS
  variante: ProduitPOSVariante
  onConfirm: (poidsKg: number) => void
  onClose: () => void
}

export function WeightInputModal({ produit, variante, onConfirm, onClose }: WeightInputModalProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const poids = parseFloat(value.replace(',', '.'))
  const valid = !isNaN(poids) && poids > 0

  const montantHT = valid ? roundFiscal(variante.prixHT * poids) : 0
  const montantTTC = valid
    ? roundFiscal(montantHT + calcMontantTVA(montantHT, variante.tauxTVA))
    : 0

  function handleConfirm() {
    if (!valid) return
    onConfirm(Math.round(poids * 1000) / 1000)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleConfirm()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-xs flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="font-semibold text-zinc-800">{produit.nom}</p>
            <p className="text-sm text-zinc-500">
              {variante.prixHT.toFixed(2).replace('.', ',')} €/kg HT
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              Poids pesé (kg)
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="number"
                min="0.001"
                step="0.001"
                placeholder="0,000"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKey}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-center font-mono text-xl font-bold tabular-nums focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none"
              />
              <span className="shrink-0 font-medium text-zinc-500">kg</span>
            </div>
          </div>

          {valid && (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-center">
              <p className="text-xs text-zinc-500">
                {poids.toFixed(3).replace('.', ',')} kg ×{' '}
                {variante.prixHT.toFixed(2).replace('.', ',')} €/kg HT
              </p>
              <p className="text-xl font-bold text-green-700">
                {montantTTC.toFixed(2).replace('.', ',')} €
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-zinc-100 px-5 py-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={!valid} className="flex-1 gap-2">
            <Check className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </div>
    </div>
  )
}
