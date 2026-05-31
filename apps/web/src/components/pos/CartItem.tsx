'use client'

import { useState } from 'react'
import { Trash2, Plus, Minus, Percent } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { roundFiscal, calcMontantTVA } from '@/lib/tva'
import type { LigneCart } from '@/types/pos'

interface CartItemProps {
  ligne: LigneCart
  onUpdateQte: (key: string, qte: number) => void
  onUpdateRemise: (key: string, remise: number) => void
  onRemoveLine: (key: string) => void
}

export function CartItem({ ligne, onUpdateQte, onUpdateRemise, onRemoveLine }: CartItemProps) {
  const [showRemise, setShowRemise] = useState(false)
  const remise = ligne.remise ?? 0

  const montantHTBrut = roundFiscal(ligne.prixUnitaireHT * ligne.qte)
  const montantHT = roundFiscal(montantHTBrut * (1 - remise / 100))
  const montantTVA = calcMontantTVA(montantHT, ligne.tauxTVA)
  const montantTTC = roundFiscal(montantHT + montantTVA)
  const montantTTCBrut = roundFiscal(montantHTBrut + calcMontantTVA(montantHTBrut, ligne.tauxTVA))

  function handleRemiseChange(val: string) {
    const n = parseFloat(val)
    if (isNaN(n) || val === '') {
      onUpdateRemise(ligne.key, 0)
    } else {
      onUpdateRemise(ligne.key, Math.min(100, Math.max(0, n)))
    }
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {ligne.produitNom}
          </p>
          <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">{ligne.varianteLabel}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            {remise > 0 && (
              <span className="text-xs text-zinc-400 line-through dark:text-zinc-500">
                {montantTTCBrut.toFixed(2).replace('.', ',')} €
              </span>
            )}
            <p className="text-sm font-bold text-green-700 dark:text-green-400">
              {montantTTC.toFixed(2).replace('.', ',')} €
            </p>
            {remise > 0 && (
              <span className="rounded bg-amber-100 px-1 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                -{remise}%
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {ligne.venteAuPoids ? (
            <>
              <Input
                type="number"
                value={ligne.qte}
                min="0.001"
                step="0.001"
                onChange={(e) => onUpdateQte(ligne.key, parseFloat(e.target.value))}
                className="w-16 border-zinc-200 px-1 py-0.5 text-center text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              <span className="text-xs text-zinc-400">kg</span>
            </>
          ) : (
            <>
              <button
                onClick={() => onUpdateQte(ligne.key, ligne.qte - 1)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-zinc-200 text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <Minus className="h-3 w-3" />
              </button>
              <Input
                type="number"
                value={ligne.qte}
                min="0.001"
                step="0.001"
                onChange={(e) => onUpdateQte(ligne.key, parseFloat(e.target.value))}
                className="w-14 border-zinc-200 px-1 py-0.5 text-center text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              <button
                onClick={() => onUpdateQte(ligne.key, ligne.qte + 1)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-zinc-200 text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <Plus className="h-3 w-3" />
              </button>
            </>
          )}
          <button
            onClick={() => setShowRemise((s) => !s)}
            className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded transition-colors ${
              remise > 0
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
                : 'text-zinc-300 hover:text-amber-500 dark:text-zinc-600 dark:hover:text-amber-400'
            }`}
          >
            <Percent className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onRemoveLine(ligne.key)}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-zinc-300 transition-colors hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {showRemise && (
        <div className="mt-2 flex items-center gap-2">
          <Input
            type="number"
            min="0"
            max="100"
            step="1"
            placeholder="Remise %"
            value={remise > 0 ? remise : ''}
            onChange={(e) => handleRemiseChange(e.target.value)}
            autoFocus
            className="h-7 w-24 border-amber-200 px-2 text-sm focus:border-amber-400 dark:border-amber-800"
          />
          <span className="text-xs text-zinc-400">%</span>
          {remise > 0 && (
            <button
              onClick={() => {
                onUpdateRemise(ligne.key, 0)
                setShowRemise(false)
              }}
              className="text-xs text-zinc-400 hover:text-red-500"
            >
              Effacer
            </button>
          )}
        </div>
      )}
    </li>
  )
}
