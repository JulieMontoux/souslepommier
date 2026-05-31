import { createContext, useContext, useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api'

export type AuthUser = {
  id: string
  username: string
  role: 'SUPERADMIN' | 'GERANT' | 'VENDEUR'
  nom: string
  prenom: string
}

type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'unauthenticated' }

type AuthContextValue = {
  state: AuthState
  login: (username: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    api
      .get<AuthUser>('/auth/me')
      .then((user) => setState({ status: 'authenticated', user }))
      .catch(() => setState({ status: 'unauthenticated' }))
  }, [])

  async function login(username: string, password: string): Promise<AuthUser> {
    const user = await api.post<AuthUser>('/auth/login', { username, password })
    setState({ status: 'authenticated', user })
    return user
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => {})
    setState({ status: 'unauthenticated' })
  }

  return <AuthContext.Provider value={{ state, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useRequireAuth() {
  const { state } = useAuth()
  if (state.status === 'authenticated') return state.user
  return null
}
