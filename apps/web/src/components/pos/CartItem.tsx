'use client'

import { Trash2, Plus, Minus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { roundFiscal, calcMontantTVA } from '@/lib/tva'
import type { LigneCart } from '@/types/pos'

interface CartItemProps {
  ligne: LigneCart
  onUpdateQte: (key: string, qte: number) => void
  onRemoveLine: (key: string) => void
}

export function CartItem({ ligne, onUpdateQte, onRemoveLine }: CartItemProps) {
  const montantHT = roundFiscal(ligne.prixUnitaireHT * ligne.qte)
  const montantTVA = calcMontantTVA(montantHT, ligne.tauxTVA)
  const montantTTC = roundFiscal(montantHT + montantTVA)

  return (
    <li className="flex items-start gap-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
          {ligne.produitNom}
        </p>
        <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">{ligne.varianteLabel}</p>
        <p className="mt-0.5 text-sm font-bold text-green-700 dark:text-green-400">
          {montantTTC.toFixed(2).replace('.', ',')} €
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
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
        <button
          onClick={() => onRemoveLine(ligne.key)}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-zinc-300 transition-colors hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  )
}
