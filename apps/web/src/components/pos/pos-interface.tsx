'use client'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth'
import { toast } from 'sonner'
import { LogOut, Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { recapTVA, roundFiscal, calcMontantTVA } from '@/lib/tva'
import { VariantePicker } from './variante-picker'
import { PaiementModal } from './paiement-modal'
import { TicketModal } from './ticket-modal'
import { ProductList } from './ProductList'
import { CartPanel } from './CartPanel'
import type { PaiementInput } from './paiement-modal'
import type { ProduitPOS, ProduitPOSVariante, LigneCart } from '@/types/pos'
import type { ConfigTicket } from '@/types/ticket'

const EMBALLAGE_LABELS: Record<string, string> = {
  VRAC: 'Vrac',
  BARQUETTE: 'Barquette',
  FILET: 'Filet',
  SAC: 'Sac',
  CAISSE: 'Caisse',
  PLATEAU: 'Plateau',
}

function buildVarianteLabel(v: ProduitPOSVariante): string {
  const parts: string[] = []
  if (v.poids) parts.push(`${v.poids} kg`)
  parts.push(EMBALLAGE_LABELS[v.emballage] ?? v.emballage)
  parts.push(`${v.prixTTC.toFixed(2).replace('.', ',')} €`)
  return parts.join(' · ')
}

interface POSInterfaceProps {
  produits: ProduitPOS[]
  user: { id: string; prenom: string; nom: string }
  config: ConfigTicket
}

export function POSInterface({ produits, user, config }: POSInterfaceProps) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }
  const [cart, setCart] = useState<LigneCart[]>([])
  const [picking, setPicking] = useState<ProduitPOS | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastVente, setLastVente] = useState<{ id: string; numeroTicket: string } | null>(null)

  function addToCart(produit: ProduitPOS) {
    if (produit.variantes.length === 0) {
      toast.error('Aucune variante disponible')
      return
    }
    if (produit.variantes.length === 1) {
      addVariante(produit, produit.variantes[0])
    } else {
      setPicking(produit)
    }
  }

  function addVariante(produit: ProduitPOS, variante: ProduitPOSVariante) {
    setPicking(null)
    setCart((prev) => {
      const existing = prev.find((l) => l.varianteProduitId === variante.id)
      if (existing) {
        return prev.map((l) =>
          l.varianteProduitId === variante.id ? { ...l, qte: roundFiscal(l.qte + 1) } : l
        )
      }
      return [
        ...prev,
        {
          key: variante.id,
          varianteProduitId: variante.id,
          produitNom: produit.nom,
          varianteLabel: buildVarianteLabel(variante),
          qte: 1,
          prixUnitaireHT: variante.prixHT,
          tauxTVA: variante.tauxTVA,
        },
      ]
    })
  }

  function updateQte(key: string, qte: number) {
    if (isNaN(qte) || qte <= 0) {
      setCart((prev) => prev.filter((l) => l.key !== key))
    } else {
      setCart((prev) => prev.map((l) => (l.key === key ? { ...l, qte } : l)))
    }
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key))
  }

  // Computed totals
  const lignesComputed = cart.map((l) => {
    const montantHT = roundFiscal(l.prixUnitaireHT * l.qte)
    const montantTVA = calcMontantTVA(montantHT, l.tauxTVA)
    return { ...l, montantHT, montantTVA, montantTTC: roundFiscal(montantHT + montantTVA) }
  })
  const totalHT = roundFiscal(lignesComputed.reduce((s, l) => s + l.montantHT, 0))
  const totalTTC = roundFiscal(lignesComputed.reduce((s, l) => s + l.montantTTC, 0))
  const tvaRecap = recapTVA(
    lignesComputed.map((l) => ({ tauxTVA: l.tauxTVA, montantHT: l.montantHT }))
  )

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't intercept when typing in inputs
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'Escape') {
        if (picking) setPicking(null)
        else if (confirming) setConfirming(false)
      }
      if (e.key === 'Enter' && !picking && !confirming && cart.length > 0) {
        setConfirming(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [picking, confirming, cart.length])

  async function handleEncaisser(paiements: PaiementInput[]) {
    if (cart.length === 0 || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/ventes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lignes: cart.map((l) => ({ varianteProduitId: l.varianteProduitId, qte: l.qte })),
          paiements,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { error?: string }).error ?? 'Erreur lors de la vente')
        return
      }
      const vente = await res.json()
      setLastVente({ id: vente.id, numeroTicket: vente.numeroTicket })
      setCart([])
      setConfirming(false)
      window.location.reload()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-background flex h-screen flex-col">
      {/* Header */}
      <header className="border-sidebar-border bg-sidebar flex h-14 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500">
            <Leaf className="h-4 w-4 text-white" />
          </div>
          <span className="text-sidebar-foreground font-semibold">Caisse</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sidebar-foreground/70 text-sm">
            {user.prenom} {user.nom}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            Quitter
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Catalogue */}
        <ProductList produits={produits} onProductSelect={addToCart} />

        {/* Panier */}
        <CartPanel
          cart={cart}
          onUpdateQte={updateQte}
          onRemoveLine={removeLine}
          onClearCart={() => setCart([])}
          onConfirmPayment={handleEncaisser}
          setConfirming={setConfirming}
          setSaving={setSaving}
          totalHT={totalHT}
          totalTTC={totalTTC}
          tvaRecap={tvaRecap}
          config={config}
          lastVente={lastVente}
          setLastVente={setLastVente}
        />
      </div>

      {/* Variante picker */}
      {picking && (
        <VariantePicker
          produit={picking}
          onSelect={(variante) => addVariante(picking, variante)}
          onClose={() => setPicking(null)}
        />
      )}

      {/* Ticket après vente */}
      {lastVente && (
        <TicketModal
          venteId={lastVente.id}
          venteNumero={lastVente.numeroTicket}
          config={config}
          onClose={() => setLastVente(null)}
        />
      )}

      {/* Modal paiement multi-modes */}
      {confirming && (
        <PaiementModal
          totalTTC={totalTTC}
          onConfirm={handleEncaisser}
          onClose={() => setConfirming(false)}
          saving={saving}
        />
      )}
    </div>
  )
}
