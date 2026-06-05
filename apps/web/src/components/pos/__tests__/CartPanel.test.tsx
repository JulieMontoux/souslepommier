import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CartPanel } from '../CartPanel'
import type { LigneCart } from '@/types/pos'
import type { ConfigTicket } from '@/types/ticket'

const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: vi.fn(),
  },
}))

const config: ConfigTicket = {
  raisonSociale: 'Sous le Pommier',
  siret: '12345678900012',
  tvaIntracommunautaire: null,
  adresse: '1 rue du verger',
  codePostal: '12345',
  ville: 'Pommiersville',
  telephone: '+33 1 23 45 67 89',
}

function makeLigne(over: Partial<LigneCart> = {}): LigneCart {
  return {
    key: 'k1',
    varianteProduitId: 'v1',
    produitNom: 'Pomme Golden',
    varianteLabel: '1 kg',
    qte: 2,
    prixUnitaireHT: 4,
    tauxTVA: 5.5,
    remise: 0,
    venteAuPoids: false,
    ...over,
  }
}

function defaultProps() {
  return {
    cart: [] as LigneCart[],
    onUpdateQte: vi.fn(),
    onUpdateRemise: vi.fn(),
    onRemoveLine: vi.fn(),
    onClearCart: vi.fn(),
    onConfirmPayment: vi.fn().mockResolvedValue(undefined),
    setConfirming: vi.fn(),
    setSaving: vi.fn(),
    totalHT: 0,
    totalTTC: 0,
    tvaRecap: [],
    config,
    lastVente: null,
    onPrintTicket: vi.fn(),
    onNouvelleVente: vi.fn(),
  }
}

describe('CartPanel', () => {
  beforeEach(() => {
    toastError.mockReset()
  })

  it('shows empty state when cart is empty and no last vente', () => {
    render(<CartPanel {...defaultProps()} />)
    expect(screen.getByText(/Panier vide/i)).toBeInTheDocument()
  })

  it('shows success state when cart empty and lastVente present', () => {
    render(
      <CartPanel {...defaultProps()} lastVente={{ id: 'v1', numeroTicket: 'T-001' }} />
    )
    expect(screen.getByText(/Vente enregistrée/i)).toBeInTheDocument()
    expect(screen.getByText('T-001')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /imprimer le ticket/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /nouvelle vente/i })).toBeInTheDocument()
  })

  it('triggers print and new sale handlers', async () => {
    const user = userEvent.setup()
    const onPrintTicket = vi.fn()
    const onNouvelleVente = vi.fn()
    render(
      <CartPanel
        {...defaultProps()}
        lastVente={{ id: 'v1', numeroTicket: 'T-001' }}
        onPrintTicket={onPrintTicket}
        onNouvelleVente={onNouvelleVente}
      />
    )

    await user.click(screen.getByRole('button', { name: /imprimer le ticket/i }))
    await user.click(screen.getByRole('button', { name: /nouvelle vente/i }))

    expect(onPrintTicket).toHaveBeenCalled()
    expect(onNouvelleVente).toHaveBeenCalled()
  })

  it('renders cart lines and totals', () => {
    const ligne = makeLigne()
    render(
      <CartPanel
        {...defaultProps()}
        cart={[ligne]}
        totalHT={8}
        totalTTC={8.44}
        tvaRecap={[{ taux: 5.5, montantTVA: 0.44 }]}
      />
    )

    expect(screen.getByText('Pomme Golden')).toBeInTheDocument()
    expect(screen.getByText('1 kg')).toBeInTheDocument()
    expect(screen.getByText(/Total HT/)).toBeInTheDocument()
    expect(screen.getByText('8,00 €')).toBeInTheDocument()
    expect(screen.getByText('TOTAL TTC')).toBeInTheDocument()
    // 8,44 € appears in both the line and the total
    expect(screen.getAllByText('8,44 €').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/TVA 5\.5%/)).toBeInTheDocument()
  })

  it('shows item count badge', () => {
    render(<CartPanel {...defaultProps()} cart={[makeLigne(), makeLigne({ key: 'k2' })]} />)
    // count badge says "2"
    expect(screen.getByText('2', { selector: 'span' })).toBeInTheDocument()
  })

  it('calls onClearCart when "Vider" clicked', async () => {
    const user = userEvent.setup()
    const onClearCart = vi.fn()
    render(
      <CartPanel
        {...defaultProps()}
        cart={[makeLigne()]}
        onClearCart={onClearCart}
      />
    )

    await user.click(screen.getByRole('button', { name: /vider/i }))
    expect(onClearCart).toHaveBeenCalled()
  })

  it('disables Encaisser when cart is empty', () => {
    render(<CartPanel {...defaultProps()} />)
    expect(screen.getByRole('button', { name: /encaisser/i })).toBeDisabled()
  })

  it('opens the payment modal flow when Encaisser clicked with no amount', async () => {
    const user = userEvent.setup()
    const setConfirming = vi.fn()
    render(
      <CartPanel
        {...defaultProps()}
        cart={[makeLigne()]}
        totalTTC={8.44}
        setConfirming={setConfirming}
      />
    )

    await user.click(screen.getByRole('button', { name: /encaisser/i }))
    expect(setConfirming).toHaveBeenCalledWith(true)
  })

  it('shows toast error when paid amount is insufficient', async () => {
    const user = userEvent.setup()
    const onConfirmPayment = vi.fn().mockResolvedValue(undefined)
    render(
      <CartPanel
        {...defaultProps()}
        cart={[makeLigne()]}
        totalTTC={10}
        onConfirmPayment={onConfirmPayment}
      />
    )

    const input = screen.getByPlaceholderText(/montant payé/i)
    await user.type(input, '5')
    await user.click(screen.getByRole('button', { name: /encaisser/i }))

    expect(toastError).toHaveBeenCalledWith('Montant insuffisant')
    expect(onConfirmPayment).not.toHaveBeenCalled()
  })

  it('calls onConfirmPayment with ESPECES and rendu monnaie when amount is sufficient', async () => {
    const user = userEvent.setup()
    const onConfirmPayment = vi.fn().mockResolvedValue(undefined)
    render(
      <CartPanel
        {...defaultProps()}
        cart={[makeLigne()]}
        totalTTC={10}
        onConfirmPayment={onConfirmPayment}
      />
    )

    const input = screen.getByPlaceholderText(/montant payé/i)
    await user.type(input, '15')
    await user.click(screen.getByRole('button', { name: /encaisser/i }))

    expect(onConfirmPayment).toHaveBeenCalledWith([
      { mode: 'ESPECES', montant: 15, renduMonnaie: 5 },
    ])
  })

  it('shows error toast if onConfirmPayment rejects', async () => {
    const user = userEvent.setup()
    const onConfirmPayment = vi.fn().mockRejectedValue(new Error('boom'))
    render(
      <CartPanel
        {...defaultProps()}
        cart={[makeLigne()]}
        totalTTC={10}
        onConfirmPayment={onConfirmPayment}
      />
    )

    const input = screen.getByPlaceholderText(/montant payé/i)
    await user.type(input, '10')
    await user.click(screen.getByRole('button', { name: /encaisser/i }))

    // wait microtasks
    await new Promise((r) => setTimeout(r, 0))
    expect(toastError).toHaveBeenCalledWith('Erreur lors de la vente')
  })
})
