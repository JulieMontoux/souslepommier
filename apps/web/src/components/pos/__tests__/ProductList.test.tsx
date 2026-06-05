import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductList } from '../ProductList'
import type { ProduitPOS, ProduitPOSVariante } from '@/types/pos'

const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => toastError(...args), success: vi.fn() },
}))

function makeVariante(over: Partial<ProduitPOSVariante> = {}): ProduitPOSVariante {
  return {
    id: 'v',
    poids: 1,
    emballage: 'BARQUETTE',
    prixHT: 5,
    tauxTVA: 5.5,
    prixTTC: 5.28,
    sku: null,
    venteAuPoids: false,
    stockActuel: 10,
    stockMin: 3,
    paliers: [],
    ...over,
  }
}

function makeProduit(over: Partial<ProduitPOS> = {}, variantes?: ProduitPOSVariante[]): ProduitPOS {
  return {
    id: 'p',
    nom: 'Pomme',
    description: null,
    image: null,
    horsJour: false,
    variantes: variantes ?? [makeVariante()],
    ...over,
  }
}

describe('ProductList', () => {
  beforeEach(() => {
    toastError.mockReset()
  })

  it('shows empty state when no products match', () => {
    render(<ProductList produits={[]} onProductSelect={vi.fn()} />)
    expect(screen.getByText(/Aucun produit trouvé/i)).toBeInTheDocument()
  })

  it('renders products with min price', () => {
    render(
      <ProductList
        produits={[
          makeProduit({ id: 'a', nom: 'Pomme' }, [
            makeVariante({ id: 'v1', prixTTC: 5 }),
            makeVariante({ id: 'v2', prixTTC: 3 }),
          ]),
        ]}
        onProductSelect={vi.fn()}
      />
    )
    expect(screen.getByText('Pomme')).toBeInTheDocument()
    expect(screen.getByText('3,00 €')).toBeInTheDocument()
    expect(screen.getByText('2 variantes')).toBeInTheDocument()
  })

  it('filters products by search input', async () => {
    const user = userEvent.setup()
    render(
      <ProductList
        produits={[
          makeProduit({ id: 'a', nom: 'Pomme Golden' }),
          makeProduit({ id: 'b', nom: 'Poire Conférence' }),
        ]}
        onProductSelect={vi.fn()}
      />
    )

    await user.type(screen.getByPlaceholderText(/rechercher/i), 'poire')

    expect(screen.queryByText('Pomme Golden')).not.toBeInTheDocument()
    expect(screen.getByText('Poire Conférence')).toBeInTheDocument()
  })

  it('calls onProductSelect when product is clicked', async () => {
    const user = userEvent.setup()
    const onProductSelect = vi.fn()
    const produit = makeProduit({ nom: 'Pomme' })
    render(<ProductList produits={[produit]} onProductSelect={onProductSelect} />)

    await user.click(screen.getByRole('button', { name: /Pomme/ }))
    expect(onProductSelect).toHaveBeenCalledWith(produit)
  })

  it('shows toast and blocks click when produit horsJour', async () => {
    const user = userEvent.setup()
    const onProductSelect = vi.fn()
    render(
      <ProductList
        produits={[makeProduit({ horsJour: true })]}
        onProductSelect={onProductSelect}
      />
    )

    await user.click(screen.getByRole('button', { name: /Pomme/ }))
    expect(toastError).toHaveBeenCalledWith('Produit hors saison')
    expect(onProductSelect).not.toHaveBeenCalled()
    expect(screen.getByText(/Hors saison/i)).toBeInTheDocument()
  })

  it('shows toast when produit has no variantes', async () => {
    const user = userEvent.setup()
    const onProductSelect = vi.fn()
    render(
      <ProductList
        produits={[makeProduit({}, [])]}
        onProductSelect={onProductSelect}
      />
    )

    await user.click(screen.getByRole('button', { name: /Pomme/ }))
    expect(toastError).toHaveBeenCalledWith('Aucune variante disponible')
    expect(onProductSelect).not.toHaveBeenCalled()
  })

  it('shows toast and blocks click when produit is out of stock', async () => {
    const user = userEvent.setup()
    const onProductSelect = vi.fn()
    render(
      <ProductList
        produits={[makeProduit({}, [makeVariante({ stockActuel: 0 })])]}
        onProductSelect={onProductSelect}
      />
    )

    await user.click(screen.getByRole('button', { name: /Pomme/ }))
    expect(toastError).toHaveBeenCalledWith('Produit épuisé')
    expect(onProductSelect).not.toHaveBeenCalled()
    expect(screen.getByText(/Épuisé/i)).toBeInTheDocument()
  })

  it('shows low-stock badge (amber) when stockActuel <= stockMin', () => {
    render(
      <ProductList
        produits={[makeProduit({}, [makeVariante({ stockActuel: 2, stockMin: 5 })])]}
        onProductSelect={vi.fn()}
      />
    )
    expect(screen.getByText(/2 pcs/)).toBeInTheDocument()
  })

  it('shows kg unit for venteAuPoids', () => {
    render(
      <ProductList
        produits={[
          makeProduit({}, [
            makeVariante({ venteAuPoids: true, stockActuel: 2.5, stockMin: 5 }),
          ]),
        ]}
        onProductSelect={vi.fn()}
      />
    )
    expect(screen.getByText(/2,500 kg/)).toBeInTheDocument()
  })

  it('does not render stock badge when product has no stockMin and stock=0', () => {
    render(
      <ProductList
        produits={[
          makeProduit({}, [makeVariante({ stockActuel: 0, stockMin: null })]),
        ]}
        onProductSelect={vi.fn()}
      />
    )
    // status returns 'none', no badge shown — there's no "Épuisé" badge in DOM
    // Search input should still render normally
    expect(screen.queryByText(/Épuisé/i)).not.toBeInTheDocument()
  })

  it('renders product image when provided', () => {
    render(
      <ProductList
        produits={[makeProduit({ image: '/img.png' })]}
        onProductSelect={vi.fn()}
      />
    )
    const img = screen.getByAltText('Pomme') as HTMLImageElement
    expect(img.src).toContain('/img.png')
  })
})
