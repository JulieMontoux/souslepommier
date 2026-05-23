'use client'

import { signOut } from 'next-auth/react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { LogOut, User } from 'lucide-react'
import { CommandPalette } from './command-palette'
import { ThemeToggle } from './theme-toggle'

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

  return (
    <header className="border-border bg-card flex h-14 items-center justify-between gap-4 border-b px-6">
      <CommandPalette />

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger className="hover:bg-muted flex items-center gap-3 rounded-lg px-2 py-1.5 focus:outline-none">
            <div className="text-right">
              <p className="text-foreground text-sm font-medium">
                {user.prenom} {user.nom}
              </p>
              <Badge
                variant={user.role === 'GERANT' ? 'default' : 'secondary'}
                className="h-4 px-1.5 text-xs"
              >
                {user.role === 'GERANT' ? 'Gérant' : 'Vendeur'}
              </Badge>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-green-100 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs text-zinc-500">{user.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer gap-2">
              <User className="h-4 w-4" />
              Mon profil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-red-600 focus:text-red-600"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
