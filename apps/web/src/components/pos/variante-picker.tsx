'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ProduitPOS, ProduitPOSVariante } from '@/types/pos'

const EMBALLAGE_LABELS: Record<string, string> = {
  VRAC: 'Vrac',
  BARQUETTE: 'Barquette',
  FILET: 'Filet',
  SAC: 'Sac',
  CAISSE: 'Caisse',
  PLATEAU: 'Plateau',
}

interface VariantePickerProps {
  produit: ProduitPOS
  onSelect: (variante: ProduitPOSVariante) => void
  onClose: () => void
}

export function VariantePicker({ produit, onSelect, onClose }: VariantePickerProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{produit.nom} — Choisir une variante</DialogTitle>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-2">
          {produit.variantes.map((v) => (
            <Button
              key={v.id}
              variant="outline"
              className="h-14 justify-between px-4 text-left"
              onClick={() => onSelect(v)}
            >
              <span className="text-zinc-700">
                {!v.venteAuPoids && v.poids ? `${v.poids} kg · ` : ''}
                {EMBALLAGE_LABELS[v.emballage] ?? v.emballage}
                {v.venteAuPoids && (
                  <span className="ml-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                    pesée
                  </span>
                )}
              </span>
              <div className="flex flex-col items-end gap-0.5">
                <span className="font-bold text-green-700">
                  {v.prixTTC.toFixed(2).replace('.', ',')} €{v.venteAuPoids ? '/kg' : ''}
                </span>
                {v.stockActuel <= 0 ? (
                  <span className="text-[10px] font-medium text-red-500">Épuisé</span>
                ) : v.stockMin !== null && v.stockActuel <= v.stockMin ? (
                  <span className="text-[10px] font-medium text-amber-500">
                    {v.venteAuPoids ? `${v.stockActuel.toFixed(3)} kg` : `${v.stockActuel} pcs`}
                  </span>
                ) : null}
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
