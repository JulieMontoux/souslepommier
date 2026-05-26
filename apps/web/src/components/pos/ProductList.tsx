'use client'

import { useState } from 'react'
import { Search, Package } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { ProduitPOS } from '@/types/pos'

interface ProductListProps {
  produits: ProduitPOS[]
  onProductSelect: (produit: ProduitPOS) => void
}

export function ProductList({ produits, onProductSelect }: ProductListProps) {
  const [search, setSearch] = useState('')
  const [activeCategorie, setActiveCategorie] = useState<string | null>(null)

  const categories = Array.from(
    new Set(produits.map((p) => p.categorieNom).filter((c): c is string => c !== null))
  ).sort()

  const filteredProduits = produits.filter((p) => {
    if (activeCategorie && p.categorieNom !== activeCategorie) return false
    if (search && !p.nom.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function handleProductClick(produit: ProduitPOS) {
    if (produit.variantes.length === 0) {
      toast.error('Aucune variante disponible')
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

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveCategorie(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeCategorie === null
                  ? 'bg-green-600 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              Tout
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategorie(activeCategorie === cat ? null : cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeCategorie === cat
                    ? 'bg-green-600 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
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
              return (
                <button
                  key={produit.id}
                  onClick={() => handleProductClick(produit)}
                  className="group flex cursor-pointer flex-col items-center gap-2.5 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-150 hover:border-green-400 hover:shadow-md active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-green-500 dark:hover:bg-zinc-800"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 transition-colors group-hover:bg-green-200 dark:bg-green-950/60 dark:group-hover:bg-green-900/60">
                    <Package className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-center text-sm leading-tight font-medium text-zinc-800 dark:text-zinc-100">
                    {produit.nom}
                  </p>
                  {produit.categorieNom && (
                    <Badge
                      variant="secondary"
                      className="text-xs dark:bg-zinc-700 dark:text-zinc-300"
                    >
                      {produit.categorieNom}
                    </Badge>
                  )}
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
