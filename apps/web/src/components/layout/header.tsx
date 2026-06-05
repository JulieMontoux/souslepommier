'use client'

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, KeyRound, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth'
import { useNetwork } from '@/hooks/use-network'

interface HeaderProps {
  user: {
    nom: string
    prenom: string
    role: string
    username: string
  }
}

export function Header({ user }: HeaderProps) {
  const initials = `${user.prenom[0] ?? ''}${user.nom[0] ?? ''}`.toUpperCase()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const online = useNetwork()
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [cpForm, setCpForm] = useState({ current: '', next: '' })
  const [cpPending, setCpPending] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (cpForm.next.length < 8) {
      toast.error('Nouveau mot de passe : 8 caractères minimum')
      return
    }
    setCpPending(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: cpForm.current, newPassword: cpForm.next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error((data as { error?: string }).error ?? 'Erreur')
        return
      }
      toast.success('Mot de passe modifié')
      setShowChangePassword(false)
      setCpForm({ current: '', next: '' })
    } finally {
      setCpPending(false)
    }
  }

  return (
    <>
      <header className="border-border bg-card/80 flex h-14 shrink-0 items-center justify-between gap-4 border-b px-6 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="Sous le Pommier" className="h-7 w-7 rounded-md object-contain" />
            <span className="hidden text-base font-bold tracking-tight sm:block" style={{ fontFamily: "'Nunito', sans-serif", color: '#2D4A3E' }}>
              Sous le Pommier
            </span>
          </div>
          {!online && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-400">
              <WifiOff className="h-3.5 w-3.5" />
              Hors ligne
            </span>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="hover:bg-accent flex items-center gap-2.5 rounded-lg px-2 py-1.5 focus:outline-none">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-green-100 text-[11px] font-semibold text-green-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-foreground text-sm leading-none font-medium">
                {user.prenom} {user.nom}
              </p>
              <p className="text-muted-foreground mt-0.5 text-[11px] leading-none">
                {user.role === 'SUPERADMIN'
                  ? 'Super Admin'
                  : user.role === 'GERANT'
                    ? 'Gérant'
                    : 'Vendeur'}
              </p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {user.username}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => setShowChangePassword(true)}
            >
              <KeyRound className="h-4 w-4" />
              Changer mon mot de passe
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-red-600 focus:text-red-600"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <form onSubmit={handleChangePassword}>
              <div className="px-6 py-5">
                <h2 className="text-lg font-semibold text-zinc-900">Changer mon mot de passe</h2>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">
                      Mot de passe actuel
                    </label>
                    <input
                      type="password"
                      value={cpForm.current}
                      onChange={(e) => setCpForm((f) => ({ ...f, current: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">
                      Nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      value={cpForm.next}
                      onChange={(e) => setCpForm((f) => ({ ...f, next: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <p className="mt-1 text-xs text-zinc-400">Minimum 8 caractères</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-zinc-100 px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowChangePassword(false)
                    setCpForm({ current: '', next: '' })
                  }}
                  disabled={cpPending}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={cpPending || !cpForm.current || !cpForm.next}>
                  {cpPending ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
