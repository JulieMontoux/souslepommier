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

  const filteredProduits = produits.filter(
    (p) => !search || p.nom.toLowerCase().includes(search.toLowerCase())
  )

  function handleProductClick(produit: ProduitPOS) {
    if (produit.variantes.length === 0) {
      toast.error('Aucune variante disponible')
      return
    }
    onProductSelect(produit)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="relative mb-4 w-72">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Rechercher un produit…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 border-zinc-200 bg-white pl-9 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

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
                  <Badge variant="secondary" className="text-xs dark:bg-zinc-700 dark:text-zinc-300">
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
  )
}
