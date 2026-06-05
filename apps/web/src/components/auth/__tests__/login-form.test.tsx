import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '../login-form'
import { ApiError } from '@/lib/api'

const navigate = vi.fn()
const login = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useLocation: () => ({ state: null }),
}))

vi.mock('@/contexts/auth', () => ({
  useAuth: () => ({ login, logout: vi.fn(), state: { status: 'unauthenticated' } }),
}))

describe('LoginForm', () => {
  beforeEach(() => {
    navigate.mockReset()
    login.mockReset()
  })

  it('renders username and password inputs', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText(/identifiant/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument()
  })

  it('renders the brand title', () => {
    render(<LoginForm />)
    expect(screen.getByText('Sous le Pommier')).toBeInTheDocument()
  })

  it('submits valid credentials and navigates GERANT to /dashboard', async () => {
    const user = userEvent.setup()
    login.mockResolvedValue({ id: '1', username: 'alice', role: 'GERANT', nom: 'A', prenom: 'B' })

    render(<LoginForm />)
    await user.type(screen.getByLabelText(/identifiant/i), 'alice')
    await user.type(screen.getByLabelText(/mot de passe/i), 'secret')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    expect(login).toHaveBeenCalledWith('alice', 'secret')
    expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true })
  })

  it('navigates VENDEUR to /pos regardless of from', async () => {
    const user = userEvent.setup()
    login.mockResolvedValue({ id: '2', username: 'bob', role: 'VENDEUR', nom: 'B', prenom: 'C' })

    render(<LoginForm />)
    await user.type(screen.getByLabelText(/identifiant/i), 'bob')
    await user.type(screen.getByLabelText(/mot de passe/i), 'secret')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    expect(navigate).toHaveBeenCalledWith('/pos', { replace: true })
  })

  it('shows generic error on invalid credentials', async () => {
    const user = userEvent.setup()
    login.mockRejectedValue(new ApiError(401, 'Unauthorized'))

    render(<LoginForm />)
    await user.type(screen.getByLabelText(/identifiant/i), 'alice')
    await user.type(screen.getByLabelText(/mot de passe/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    expect(await screen.findByText(/identifiant ou mot de passe incorrect/i)).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('shows rate-limit error on 429', async () => {
    const user = userEvent.setup()
    login.mockRejectedValue(new ApiError(429, 'Too many'))

    render(<LoginForm />)
    await user.type(screen.getByLabelText(/identifiant/i), 'alice')
    await user.type(screen.getByLabelText(/mot de passe/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    expect(await screen.findByText(/trop de tentatives/i)).toBeInTheDocument()
  })

  it('shows generic error on unknown failure', async () => {
    const user = userEvent.setup()
    login.mockRejectedValue(new Error('boom'))

    render(<LoginForm />)
    await user.type(screen.getByLabelText(/identifiant/i), 'alice')
    await user.type(screen.getByLabelText(/mot de passe/i), 'secret')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    expect(await screen.findByText(/une erreur est survenue/i)).toBeInTheDocument()
  })

  it('disables the submit button while pending', async () => {
    const user = userEvent.setup()
    let resolveLogin: (v: unknown) => void = () => {}
    login.mockReturnValue(
      new Promise((res) => {
        resolveLogin = res
      })
    )

    render(<LoginForm />)
    await user.type(screen.getByLabelText(/identifiant/i), 'alice')
    await user.type(screen.getByLabelText(/mot de passe/i), 'secret')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    expect(screen.getByRole('button', { name: /connexion/i })).toBeDisabled()
    resolveLogin({ id: '1', username: 'alice', role: 'GERANT', nom: '', prenom: '' })
  })
})
