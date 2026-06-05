'use client'

import { useState } from 'react'
import { Search, Package } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import type { ProduitPOS, ProduitPOSVariante } from '@/types/pos'

type StockStatus = 'ok' | 'low' | 'out' | 'none'

function getStockStatus(variantes: ProduitPOSVariante[]): StockStatus {
  if (variantes.length === 0) return 'none'
  const totalStock = variantes.reduce((s, v) => s + v.stockActuel, 0)
  const hasMin = variantes.some((v) => v.stockMin !== null)
  if (!hasMin && totalStock === 0) return 'none'
  if (totalStock <= 0) return 'out'
  if (hasMin && variantes.some((v) => v.stockMin !== null && v.stockActuel <= v.stockMin))
    return 'low'
  return 'ok'
}

function StockBadge({ variantes }: { variantes: ProduitPOSVariante[] }) {
  const status = getStockStatus(variantes)
  if (status === 'none') return null
  const isKg = variantes.some((v) => v.venteAuPoids)
  const totalStock = variantes.reduce((s, v) => s + v.stockActuel, 0)
  const label = isKg ? `${totalStock.toFixed(3).replace('.', ',')} kg` : `${totalStock} pcs`

  if (status === 'out')
    return (
      <span className="absolute top-1.5 right-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] leading-none font-bold text-white">
        Épuisé
      </span>
    )
  if (status === 'low')
    return (
      <span className="absolute top-1.5 right-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] leading-none font-bold text-white">
        {label}
      </span>
    )
  return (
    <span className="absolute top-1.5 right-1.5 rounded-full bg-green-500 px-1.5 py-0.5 text-[10px] leading-none font-medium text-white">
      {label}
    </span>
  )
}

interface ProductListProps {
  produits: ProduitPOS[]
  onProductSelect: (produit: ProduitPOS) => void
}

export function ProductList({ produits, onProductSelect }: ProductListProps) {
  const [search, setSearch] = useState('')
  const filteredProduits = produits.filter((p) => {
    if (search && !p.nom.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function handleProductClick(produit: ProduitPOS) {
    if (produit.horsJour) {
      toast.error('Produit hors saison')
      return
    }
    if (produit.variantes.length === 0) {
      toast.error('Aucune variante disponible')
      return
    }
    if (getStockStatus(produit.variantes) === 'out') {
      toast.error('Produit épuisé')
      return
    }
    onProductSelect(produit)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Barre de recherche + filtres catégorie */}
      <div className="shrink-0 space-y-3 p-4">
        <div className="relative w-72">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Rechercher un produit…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 border-zinc-200 bg-white pl-9 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

      </div>

      {/* Grille produits */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filteredProduits.length === 0 ? (
          <div className="mt-20 flex flex-col items-center gap-2 text-center">
            <Package className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-400 dark:text-zinc-500">Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProduits.map((produit) => {
              const prixMin = produit.variantes.length
                ? Math.min(...produit.variantes.map((v) => v.prixTTC))
                : null
              const stockStatus = getStockStatus(produit.variantes)
              const isDisabled = produit.horsJour || stockStatus === 'out'
              return (
                <button
                  key={produit.id}
                  onClick={() => handleProductClick(produit)}
                  className={`group relative flex cursor-pointer flex-col items-center gap-2.5 rounded-xl border p-4 shadow-sm transition-all duration-150 ${
                    isDisabled
                      ? 'cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-50 dark:border-zinc-700 dark:bg-zinc-900/50'
                      : 'border-zinc-200 bg-white hover:border-green-400 hover:shadow-md active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-green-500 dark:hover:bg-zinc-800'
                  }`}
                >
                  {produit.horsJour ? (
                    <span className="absolute top-1.5 right-1.5 rounded-full bg-zinc-500 px-1.5 py-0.5 text-[10px] leading-none font-bold text-white">
                      Hors saison
                    </span>
                  ) : (
                    <StockBadge variantes={produit.variantes} />
                  )}
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-green-100 transition-colors group-hover:bg-green-200 dark:bg-green-950/60 dark:group-hover:bg-green-900/60">
                    {produit.image ? (
                      <img
                        src={produit.image}
                        alt={produit.nom}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="h-7 w-7 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <p className="text-center text-sm leading-tight font-medium text-zinc-800 dark:text-zinc-100">
                    {produit.nom}
                  </p>
                  {prixMin !== null && (
                    <p className="text-sm font-bold text-green-700 dark:text-green-400">
                      {prixMin.toFixed(2).replace('.', ',')} €
                    </p>
                  )}
                  {produit.variantes.length > 1 && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      {produit.variantes.length} variantes
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
