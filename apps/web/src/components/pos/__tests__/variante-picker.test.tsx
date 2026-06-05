import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VariantePicker } from '../variante-picker'
import type { ProduitPOS, ProduitPOSVariante } from '@/types/pos'

function makeVariante(overrides: Partial<ProduitPOSVariante> = {}): ProduitPOSVariante {
  return {
    id: 'v1',
    poids: 1,
    emballage: 'BARQUETTE',
    prixHT: 10,
    tauxTVA: 5.5,
    prixTTC: 10.55,
    sku: null,
    venteAuPoids: false,
    stockActuel: 5,
    stockMin: null,
    paliers: [],
    ...overrides,
  }
}

function makeProduit(variantes: ProduitPOSVariante[]): ProduitPOS {
  return {
    id: 'p1',
    nom: 'Pomme',
    description: null,
    image: null,
    horsJour: false,
    variantes,
  }
}

describe('VariantePicker', () => {
  it('renders the product name in the title', () => {
    render(
      <VariantePicker
        produit={makeProduit([makeVariante()])}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText(/Pomme/)).toBeInTheDocument()
    expect(screen.getByText(/Choisir une variante/)).toBeInTheDocument()
  })

  it('renders each variant with formatted price', () => {
    render(
      <VariantePicker
        produit={makeProduit([
          makeVariante({ id: 'a', prixTTC: 12.34, emballage: 'BARQUETTE' }),
          makeVariante({ id: 'b', prixTTC: 5.6, emballage: 'FILET' }),
        ])}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText(/12,34 €/)).toBeInTheDocument()
    expect(screen.getByText(/5,60 €/)).toBeInTheDocument()
  })

  it('calls onSelect when a variant is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const variante = makeVariante({ id: 'b', emballage: 'FILET' })
    render(
      <VariantePicker
        produit={makeProduit([variante])}
        onSelect={onSelect}
        onClose={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: /Filet/ }))
    expect(onSelect).toHaveBeenCalledWith(variante)
  })

  it('shows "Épuisé" badge when stock is 0', () => {
    render(
      <VariantePicker
        produit={makeProduit([makeVariante({ stockActuel: 0 })])}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText(/Épuisé/i)).toBeInTheDocument()
  })

  it('shows low-stock warning when stockActuel <= stockMin', () => {
    render(
      <VariantePicker
        produit={makeProduit([makeVariante({ stockActuel: 2, stockMin: 3 })])}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText(/2 pcs/)).toBeInTheDocument()
  })

  it('shows weight unit and "pesée" badge for weighted items', () => {
    render(
      <VariantePicker
        produit={makeProduit([
          makeVariante({ venteAuPoids: true, prixTTC: 4.5, stockActuel: 1.234, stockMin: 5 }),
        ])}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText(/pesée/i)).toBeInTheDocument()
    expect(screen.getByText(/4,50 €\/kg/)).toBeInTheDocument()
    expect(screen.getByText(/1\.234 kg|1,234 kg/)).toBeInTheDocument()
  })

  it('shows weight in label for fixed-weight non-poids variants', () => {
    render(
      <VariantePicker
        produit={makeProduit([
          makeVariante({ poids: 0.5, venteAuPoids: false, emballage: 'BARQUETTE' }),
        ])}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText(/0\.5 kg/)).toBeInTheDocument()
  })

  it('falls back to raw emballage when not in label map', () => {
    render(
      <VariantePicker
        produit={makeProduit([makeVariante({ emballage: 'UNKNOWN' })])}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText(/UNKNOWN/)).toBeInTheDocument()
  })
})
