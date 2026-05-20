'use client'

import { useState } from 'react'
import { Trash2, Plus, Minus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { LigneCart } from '@/types/pos'

interface CartItemProps {
  ligne: LigneCart
  onUpdateQte: (key: string, qte: number) => void
  onRemoveLine: (key: string) => void
}

export function CartItem({ ligne, onUpdateQte, onRemoveLine }: CartItemProps) {
  return (
    <li key={ligne.key} className="flex items-start gap-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-800">{ligne.produitNom}</p>
        <p className="truncate text-xs text-zinc-400">{ligne.varianteLabel}</p>
        <p className="mt-0.5 text-sm font-bold text-zinc-900">
          {ligne.montantTTC.toFixed(2).replace('.', ',')} €
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={() => onUpdateQte(ligne.key, ligne.qte - 1)}
          className="flex h-7 w-7 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
        >
          <Minus className="h-3 w-3" />
        </button>
        <Input
          type="number"
          value={ligne.qte}
          min="0.001"
          step="0.001"
          onChange={(e) => onUpdateQte(ligne.key, parseFloat(e.target.value))}
          className="w-14 rounded border border-zinc-200 px-1 py-0.5 text-center text-sm"
        />
        <button
          onClick={() => onUpdateQte(ligne.key, ligne.qte + 1)}
          className="flex h-7 w-7 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
        >
          <Plus className="h-3 w-3" />
        </button>
        <button
          onClick={() => onRemoveLine(ligne.key)}
          className="flex h-7 w-7 items-center justify-center rounded text-zinc-300 hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  )
}
