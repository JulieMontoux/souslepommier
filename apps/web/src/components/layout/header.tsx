'use client'

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
import { LogOut, User } from 'lucide-react'
import { CommandPalette } from './command-palette'
import { useAuth } from '@/contexts/auth'

interface HeaderProps {
  user: {
    nom: string
    prenom: string
    role: string
    email: string
  }
}

export function Header({ user }: HeaderProps) {
  const initials = `${user.prenom[0] ?? ''}${user.nom[0] ?? ''}`.toUpperCase()
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="border-border bg-card flex h-14 shrink-0 items-center justify-between gap-4 border-b px-6">
      <CommandPalette />

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
              {user.role === 'GERANT' ? 'Gérant' : 'Vendeur'}
            </p>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-muted-foreground text-xs">
            {user.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer gap-2">
            <User className="h-4 w-4" />
            Mon profil
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
  )
}
