'use client'

import { useState } from 'react'
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
    if (produit.variantes.length === 1) {
      onProductSelect(produit)
    } else {
      // Will be handled by parent component to show variant picker
      onProductSelect(produit)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="relative mb-4 w-72">
        <svg
          className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <Input
          placeholder="Rechercher un produit…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 pl-9"
        />
      </div>

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
                onClick={() => handleProductClick(produit)}
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
    </div>
  )
}
