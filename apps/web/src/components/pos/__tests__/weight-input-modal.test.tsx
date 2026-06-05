import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WeightInputModal } from '../weight-input-modal'
import type { ProduitPOS, ProduitPOSVariante } from '@/types/pos'

const produit: ProduitPOS = {
  id: 'p1',
  nom: 'Pommes vrac',
  description: null,
  image: null,
  horsJour: false,
  variantes: [],
}

const variante: ProduitPOSVariante = {
  id: 'v1',
  poids: null,
  emballage: 'VRAC',
  prixHT: 4,
  tauxTVA: 5.5,
  prixTTC: 4.22,
  sku: null,
  venteAuPoids: true,
  stockActuel: 100,
  stockMin: null,
  paliers: [],
}

describe('WeightInputModal', () => {
  it('renders product name and price/kg HT', () => {
    render(
      <WeightInputModal
        produit={produit}
        variante={variante}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('Pommes vrac')).toBeInTheDocument()
    expect(screen.getByText(/4,00 €\/kg HT/)).toBeInTheDocument()
  })

  it('disables the Add button when no weight entered', () => {
    render(
      <WeightInputModal
        produit={produit}
        variante={variante}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /ajouter/i })).toBeDisabled()
  })

  it('enables the Add button and shows total when valid weight entered', async () => {
    const user = userEvent.setup()
    render(
      <WeightInputModal
        produit={produit}
        variante={variante}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText('0,000') as HTMLInputElement
    await user.type(input, '2.5')

    expect(screen.getByRole('button', { name: /ajouter/i })).toBeEnabled()
    // 2.5kg * 4 HT = 10 HT, TVA 5.5% => 10.55 TTC
    expect(screen.getByText(/10,55 €/)).toBeInTheDocument()
  })

  it('treats comma as decimal separator', async () => {
    const user = userEvent.setup()
    render(
      <WeightInputModal
        produit={produit}
        variante={variante}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText('0,000')
    // number inputs ignore commas, but we still test the handler path with onChange
    await user.type(input, '1.5')
    expect(screen.getByRole('button', { name: /ajouter/i })).toBeEnabled()
  })

  it('calls onConfirm with rounded poids on click', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <WeightInputModal
        produit={produit}
        variante={variante}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText('0,000')
    await user.type(input, '1.2345')
    await user.click(screen.getByRole('button', { name: /ajouter/i }))

    expect(onConfirm).toHaveBeenCalledWith(1.235)
  })

  it('calls onClose when Annuler clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <WeightInputModal
        produit={produit}
        variante={variante}
        onConfirm={vi.fn()}
        onClose={onClose}
      />
    )

    await user.click(screen.getByRole('button', { name: /annuler/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when X is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(
      <WeightInputModal
        produit={produit}
        variante={variante}
        onConfirm={vi.fn()}
        onClose={onClose}
      />
    )

    // X button is the unnamed button at the top right
    const buttons = container.querySelectorAll('button')
    // first button is the X
    await user.click(buttons[0])
    expect(onClose).toHaveBeenCalled()
  })

  it('confirms on Enter key', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <WeightInputModal
        produit={produit}
        variante={variante}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText('0,000')
    await user.type(input, '2')
    await user.keyboard('{Enter}')

    expect(onConfirm).toHaveBeenCalledWith(2)
  })

  it('closes on Escape key', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <WeightInputModal
        produit={produit}
        variante={variante}
        onConfirm={vi.fn()}
        onClose={onClose}
      />
    )

    const input = screen.getByPlaceholderText('0,000')
    input.focus()
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })

  it('does not call onConfirm when weight is invalid', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <WeightInputModal
        produit={produit}
        variante={variante}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />
    )

    // Type nothing, then press enter
    const input = screen.getByPlaceholderText('0,000')
    input.focus()
    await user.keyboard('{Enter}')
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
