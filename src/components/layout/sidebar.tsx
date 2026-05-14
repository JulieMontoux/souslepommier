'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingBasket,
  FileText,
  BarChart3,
  Users,
  Settings,
  Package,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/produits', label: 'Produits', icon: Package },
  { href: '/dashboard/ventes', label: 'Ventes', icon: ShoppingBasket },
  { href: '/dashboard/factures', label: 'Factures', icon: FileText },
  { href: '/dashboard/statistiques', label: 'Statistiques', icon: BarChart3 },
  { href: '/dashboard/vendeurs', label: 'Vendeurs', icon: Users },
  { href: '/dashboard/configuration', label: 'Configuration', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-64 flex-col border-r border-zinc-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-zinc-200 px-6">
        <span className="text-xl">🍎</span>
        <span className="font-semibold text-zinc-900">Sous le Pommier</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-green-50 text-green-700'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
