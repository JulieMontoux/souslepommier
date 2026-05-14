'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { toast } from 'sonner'
import { Search, Trash2, LogOut, ShoppingCart, Plus, Minus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { recapTVA, roundFiscal, calcMontantTVA } from '@/lib/tva'
import { VariantePicker } from './variante-picker'
import { PaiementModal } from './paiement-modal'
import type { PaiementInput } from './paiement-modal'
import type { ProduitPOS, ProduitPOSVariante, LigneCart } from '@/types/pos'

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
}

export function POSInterface({ produits, user }: POSInterfaceProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<LigneCart[]>([])
  const [picking, setPicking] = useState<ProduitPOS | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)

  const filteredProduits = produits.filter(
    (p) => !search || p.nom.toLowerCase().includes(search.toLowerCase())
  )

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
      toast.success(
        `Vente ${vente.numeroTicket} enregistrée — ${totalTTC.toFixed(2).replace('.', ',')} €`
      )
      setCart([])
      setConfirming(false)
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-100">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between bg-white px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍎</span>
          <span className="font-semibold text-zinc-800">Caisse</span>
        </div>
        <div className="relative w-72">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Rechercher un produit…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-600">
            {user.prenom} {user.nom}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="gap-1.5 text-zinc-500"
          >
            <LogOut className="h-4 w-4" />
            Quitter
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Catalogue */}
        <main className="flex-1 overflow-y-auto p-4">
          {filteredProduits.length === 0 ? (
            <p className="mt-20 text-center text-zinc-400">Aucun produit trouvé</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredProduits.map((produit) => {
                const prixMin = produit.variantes.length
                  ? Math.min(...produit.variantes.map((v) => v.prixTTC))
                  : null
                return (
                  <button
                    key={produit.id}
                    onClick={() => addToCart(produit)}
                    className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-green-400 hover:shadow-md active:scale-95"
                  >
                    <span className="text-4xl">🍎</span>
                    <p className="text-center text-sm leading-tight font-medium text-zinc-800">
                      {produit.nom}
                    </p>
                    {produit.categorieNom && (
                      <Badge variant="secondary" className="text-xs">
                        {produit.categorieNom}
                      </Badge>
                    )}
                    {prixMin !== null && (
                      <p className="text-sm font-bold text-green-700">
                        {prixMin.toFixed(2).replace('.', ',')} €
                      </p>
                    )}
                    {produit.variantes.length > 1 && (
                      <p className="text-xs text-zinc-400">{produit.variantes.length} variantes</p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </main>

        {/* Panier */}
        <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-200 bg-white">
          {/* Panier header */}
          <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
            <ShoppingCart className="h-4 w-4 text-zinc-500" />
            <span className="font-semibold text-zinc-800">Panier</span>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
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
                {lignesComputed.map((ligne) => (
                  <li key={ligne.key} className="flex items-start gap-2 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-800">
                        {ligne.produitNom}
                      </p>
                      <p className="truncate text-xs text-zinc-400">{ligne.varianteLabel}</p>
                      <p className="mt-0.5 text-sm font-bold text-zinc-900">
                        {ligne.montantTTC.toFixed(2).replace('.', ',')} €
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => updateQte(ligne.key, roundFiscal(ligne.qte - 1))}
                        className="flex h-7 w-7 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        value={ligne.qte}
                        min="0.001"
                        step="0.001"
                        onChange={(e) => updateQte(ligne.key, parseFloat(e.target.value))}
                        className="w-14 rounded border border-zinc-200 px-1 py-0.5 text-center text-sm"
                      />
                      <button
                        onClick={() => updateQte(ligne.key, roundFiscal(ligne.qte + 1))}
                        className="flex h-7 w-7 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => removeLine(ligne.key)}
                        className="flex h-7 w-7 items-center justify-center rounded text-zinc-300 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
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
            <Button
              className="h-14 w-full gap-2 text-base font-bold"
              disabled={cart.length === 0}
              onClick={() => setConfirming(true)}
            >
              💳 {cart.length > 0 ? `Payer ${totalTTC.toFixed(2).replace('.', ',')} €` : 'Payer'}
            </Button>
            <p className="mt-1.5 text-center text-xs text-zinc-400">ou appuyez sur Entrée</p>
          </div>
        </aside>
      </div>

      {/* Variante picker */}
      {picking && (
        <VariantePicker
          produit={picking}
          onSelect={(variante) => addVariante(picking, variante)}
          onClose={() => setPicking(null)}
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
