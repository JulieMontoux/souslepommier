import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaiementModal } from '../paiement-modal'

describe('PaiementModal', () => {
  it('renders the total amount', () => {
    render(
      <PaiementModal
        totalTTC={42.5}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        saving={false}
      />
    )
    expect(screen.getByText(/42,50 €/)).toBeInTheDocument()
    expect(screen.getByText(/À régler/i)).toBeInTheDocument()
  })

  it('renders all payment mode buttons', () => {
    render(
      <PaiementModal totalTTC={10} onConfirm={vi.fn()} onClose={vi.fn()} saving={false} />
    )
    expect(screen.getByRole('button', { name: /Espèces/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Carte bancaire/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Chèque/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Virement/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ticket resto/i })).toBeInTheDocument()
  })

  it('Encaisser is disabled when no payment line', () => {
    render(
      <PaiementModal totalTTC={10} onConfirm={vi.fn()} onClose={vi.fn()} saving={false} />
    )
    expect(screen.getByRole('button', { name: /encaisser/i })).toBeDisabled()
  })

  it('adds a payment line with the remaining amount prefilled', async () => {
    const user = userEvent.setup()
    render(
      <PaiementModal totalTTC={10} onConfirm={vi.fn()} onClose={vi.fn()} saving={false} />
    )

    await user.click(screen.getByRole('button', { name: /Espèces/i }))

    // an input field with value 10.00 should now appear
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs[0]).toHaveValue(10)
  })

  it('enables Encaisser when total is reached', async () => {
    const user = userEvent.setup()
    render(
      <PaiementModal totalTTC={10} onConfirm={vi.fn()} onClose={vi.fn()} saving={false} />
    )

    await user.click(screen.getByRole('button', { name: /Espèces/i }))
    expect(screen.getByRole('button', { name: /encaisser/i })).toBeEnabled()
  })

  it('calls onConfirm with the payment input on submit', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <PaiementModal totalTTC={10} onConfirm={onConfirm} onClose={vi.fn()} saving={false} />
    )

    await user.click(screen.getByRole('button', { name: /Carte bancaire/i }))
    await user.click(screen.getByRole('button', { name: /encaisser/i }))

    expect(onConfirm).toHaveBeenCalledWith([{ mode: 'CB', montant: 10 }])
  })

  it('does not call onConfirm if reste à payer > 0', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <PaiementModal totalTTC={20} onConfirm={onConfirm} onClose={vi.fn()} saving={false} />
    )

    await user.click(screen.getByRole('button', { name: /Espèces/i }))
    const input = screen.getAllByRole('spinbutton')[0] as HTMLInputElement
    await user.clear(input)
    await user.type(input, '5')

    expect(screen.getByRole('button', { name: /encaisser/i })).toBeDisabled()
  })

  it('shows "Rendu monnaie" when overpaid in cash', async () => {
    const user = userEvent.setup()
    render(
      <PaiementModal totalTTC={10} onConfirm={vi.fn()} onClose={vi.fn()} saving={false} />
    )

    await user.click(screen.getByRole('button', { name: /Espèces/i }))
    const input = screen.getAllByRole('spinbutton')[0] as HTMLInputElement
    await user.clear(input)
    await user.type(input, '15')

    expect(screen.getByText(/Rendu monnaie/i)).toBeInTheDocument()
    // 5,00 may collide if some other element renders the same; use getAllByText
    expect(screen.getAllByText(/5,00 €/).length).toBeGreaterThanOrEqual(1)
  })

  it('allows removing a payment line', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <PaiementModal totalTTC={10} onConfirm={vi.fn()} onClose={vi.fn()} saving={false} />
    )

    await user.click(screen.getByRole('button', { name: /Espèces/i }))
    expect(screen.getAllByRole('spinbutton')).toHaveLength(1)

    // Locate trash button via its child svg (lucide-trash-2 icon)
    const trashSvg = container.querySelector('svg.lucide-trash-2')
    expect(trashSvg).not.toBeNull()
    const trashButton = trashSvg!.closest('button')!
    await user.click(trashButton)

    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0)
  })

  it('shows a reference input for chèque', async () => {
    const user = userEvent.setup()
    render(
      <PaiementModal totalTTC={10} onConfirm={vi.fn()} onClose={vi.fn()} saving={false} />
    )

    await user.click(screen.getByRole('button', { name: /Chèque/i }))
    expect(screen.getByPlaceholderText(/N° chèque/i)).toBeInTheDocument()
  })

  it('passes reference along with payment', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <PaiementModal totalTTC={10} onConfirm={onConfirm} onClose={vi.fn()} saving={false} />
    )

    await user.click(screen.getByRole('button', { name: /Chèque/i }))
    await user.type(screen.getByPlaceholderText(/N° chèque/i), '123ABC')
    await user.click(screen.getByRole('button', { name: /encaisser/i }))

    expect(onConfirm).toHaveBeenCalledWith([{ mode: 'CHEQUE', montant: 10, reference: '123ABC' }])
  })

  it('disables a payment mode button once added', async () => {
    const user = userEvent.setup()
    render(
      <PaiementModal totalTTC={10} onConfirm={vi.fn()} onClose={vi.fn()} saving={false} />
    )

    const espBtn = screen.getByRole('button', { name: /Espèces/i })
    await user.click(espBtn)
    expect(espBtn).toBeDisabled()
  })

  it('shows "Enregistrement…" while saving', () => {
    render(
      <PaiementModal totalTTC={10} onConfirm={vi.fn()} onClose={vi.fn()} saving={true} />
    )
    expect(screen.getByRole('button', { name: /enregistrement/i })).toBeDisabled()
  })

  it('calls onClose on Annuler', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <PaiementModal totalTTC={10} onConfirm={vi.fn()} onClose={onClose} saving={false} />
    )

    await user.click(screen.getByRole('button', { name: /annuler/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
