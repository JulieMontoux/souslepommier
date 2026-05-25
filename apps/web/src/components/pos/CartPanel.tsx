'use client'

import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { LigneCart } from '@/types/pos'
import { CartItem } from './CartItem'
import type { PaiementInput } from './paiement-modal'
import type { ConfigTicket } from '@/types/ticket'

interface CartPanelProps {
  cart: LigneCart[]
  onUpdateQte: (key: string, qte: number) => void
  onRemoveLine: (key: string) => void
  onClearCart: () => void
  onConfirmPayment: (paiements: PaiementInput[]) => Promise<void>
  setConfirming: React.Dispatch<React.SetStateAction<boolean>>
  setSaving: React.Dispatch<React.SetStateAction<boolean>>
  totalHT: number
  totalTTC: number
  tvaRecap: { taux: number; montantTVA: number }[]
  config: ConfigTicket
  lastVente: { id: string; numeroTicket: string } | null
  setLastVente: React.Dispatch<React.SetStateAction<{ id: string; numeroTicket: string } | null>>
}

export function CartPanel({
  cart,
  onUpdateQte,
  onRemoveLine,
  onClearCart,
  onConfirmPayment,
  setConfirming,
  setSaving,
  totalHT,
  totalTTC,
  tvaRecap,
}: CartPanelProps) {
  const [paye, setPaye] = useState('')

  function handleEncaisser() {
    if (cart.length === 0) return
    const numer = parseFloat(paye)
    if (paye.trim() === '' || isNaN(numer)) {
      setConfirming(true)
      return
    }
    if (numer < totalTTC) {
      toast.error('Montant insuffisant')
      return
    }
    const rendu = numer - totalTTC
    const paiements: PaiementInput[] = [{ mode: 'ESPECES', montant: numer, renduMonnaie: rendu }]
    onConfirmPayment(paiements).catch(() => {
      toast.error('Erreur lors de la vente')
    })
  }

  return (
    <aside className="flex w-88 shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <ShoppingCart className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
        <span className="font-semibold text-zinc-800 dark:text-zinc-100">Panier</span>
        {cart.length > 0 && (
          <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-green-100 px-1.5 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-400">
            {cart.length}
          </span>
        )}
        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            className="ml-auto cursor-pointer text-xs text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
          >
            Vider
          </button>
        )}
      </div>

      {/* Lignes */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-2 text-center">
            <ShoppingCart className="h-10 w-10 text-zinc-200 dark:text-zinc-700" />
            <p className="text-sm text-zinc-400 dark:text-zinc-500">Panier vide</p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {cart.map((ligne) => (
              <CartItem
                key={ligne.key}
                ligne={ligne}
                onUpdateQte={onUpdateQte}
                onRemoveLine={onRemoveLine}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Totaux */}
      <div className="space-y-1 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
          <span>Total HT</span>
          <span>{totalHT.toFixed(2).replace('.', ',')} €</span>
        </div>
        {tvaRecap.map((t) => (
          <div
            key={t.taux}
            className="flex justify-between text-xs text-zinc-400 dark:text-zinc-500"
          >
            <span>TVA {t.taux}%</span>
            <span>{t.montantTVA.toFixed(2).replace('.', ',')} €</span>
          </div>
        ))}
        <div className="flex justify-between rounded-lg bg-zinc-50 px-3 py-2 text-lg font-bold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
          <span>TOTAL TTC</span>
          <span>{totalTTC.toFixed(2).replace('.', ',')} €</span>
        </div>
      </div>

      {/* Paiement rapide */}
      <div className="border-t border-zinc-100 px-4 pt-3 pb-4 dark:border-zinc-800">
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Montant payé"
            value={paye}
            onChange={(e) => setPaye(e.target.value)}
            className="flex-1 border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800"
          />
          <Button
            onClick={handleEncaisser}
            disabled={cart.length === 0}
            className="h-10 gap-2 text-sm font-bold"
          >
            Encaisser
          </Button>
        </div>
        <p className="mt-1.5 text-center text-xs text-zinc-400 dark:text-zinc-500">
          ou appuyez sur{' '}
          <kbd className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-700">
            ↵
          </kbd>
        </p>
      </div>
    </aside>
  )
}
