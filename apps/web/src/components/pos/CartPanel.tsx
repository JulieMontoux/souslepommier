'use client'

import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  router: ReturnType<typeof import('next/navigation').useRouter>
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
  config,
  lastVente,
  setLastVente,
  router,
}: CartPanelProps) {
  const [paye, setPaye] = useState('')

  function handleEncaisser() {
    if (cart.length === 0) return
    const numer = parseFloat(paye)
    if (isNaN(numer) || numer < totalTTC) {
      toast.error('Montant insuffisant')
      return
    }
    // For simplicity, we assume single payment mode ESPECES with rendu monnaie
    const rendu = numer - totalTTC
    const paiements: PaiementInput[] = [
      {
        mode: 'ESPECES',
        montant: numer,
        renduMonnaie: rendu,
      },
    ]
    setConfirming(true)
    onConfirmPayment(paiements).catch(() => {
      setConfirming(false)
      toast.error('Erreur lors de la vente')
    })
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-200 bg-white">
      {/* Panier header */}
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
        <ShoppingCart className="h-4 w-4 text-zinc-500" />
        <span className="font-semibold text-zinc-800">Panier</span>
        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            className="ml-auto text-xs text-zinc-400 hover:text-red-500"
          >
            Vider
          </button>
        )}
      </div>

      {/* Lignes */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <p className="mt-12 text-center text-sm text-zinc-400">Panier vide</p>
        ) : (
          <ul className="divide-y divide-zinc-50">
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
      <div className="space-y-1 border-t border-zinc-100 px-4 py-3">
        <div className="flex justify-between text-sm text-zinc-600">
          <span>Total HT</span>
          <span>{totalHT.toFixed(2).replace('.', ',')} €</span>
        </div>
        {tvaRecap.map((t) => (
          <div key={t.taux} className="flex justify-between text-xs text-zinc-400">
            <span>TVA {t.taux}%</span>
            <span>{t.montantTVA.toFixed(2).replace('.', ',')} €</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-zinc-100 pt-2 text-lg font-bold text-zinc-900">
          <span>TOTAL</span>
          <span>{totalTTC.toFixed(2).replace('.', ',')} €</span>
        </div>
      </div>

      {/* Bouton payer */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Montant payé"
            value={paye}
            onChange={(e) => setPaye(e.target.value)}
            className="flex-1 rounded border border-zinc-200"
          />
          <Button onClick={handleEncaisser} className="h-10 gap-2 text-sm font-bold">
            Payer
          </Button>
        </div>
        <p className="mt-1.5 text-center text-xs text-zinc-400">ou appuyez sur Entrée</p>
      </div>
    </aside>
  )
}
