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
                {v.poids ? `${v.poids} kg · ` : ''}
                {EMBALLAGE_LABELS[v.emballage] ?? v.emballage}
              </span>
              <span className="font-bold text-green-700">
                {v.prixTTC.toFixed(2).replace('.', ',')} €
              </span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
