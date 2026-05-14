'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DeactivateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  label: string
  description?: string
  onConfirm: () => void
  loading?: boolean
}

export function DeactivateDialog({
  open,
  onOpenChange,
  label,
  description,
  onConfirm,
  loading,
}: DeactivateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Désactiver {label} ?</DialogTitle>
          <DialogDescription>
            {description ??
              'Cette action désactivera également toutes les variantes associées. Le produit ne sera plus visible dans le POS.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? 'Désactivation…' : 'Désactiver'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
