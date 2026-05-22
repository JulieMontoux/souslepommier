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
  Building2,
  Lock,
  ScrollText,
  Percent,
  ShieldAlert,
  CreditCard,
  Leaf,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  exact?: boolean
}

const navGroups: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
      { href: '/pos', label: 'Caisse', icon: CreditCard, exact: true },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { href: '/dashboard/produits', label: 'Produits', icon: Package },
      { href: '/dashboard/ventes', label: 'Ventes', icon: ShoppingBasket },
      { href: '/dashboard/clients', label: 'Clients', icon: Building2 },
      { href: '/dashboard/factures', label: 'Factures', icon: FileText },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { href: '/dashboard/clotures', label: 'Clôtures', icon: Lock },
      { href: '/dashboard/statistiques', label: 'Statistiques', icon: BarChart3 },
      { href: '/dashboard/vendeurs', label: 'Vendeurs', icon: Users },
      { href: '/dashboard/audit', label: 'Audit', icon: ScrollText },
    ],
  },
  {
    label: 'Réglages',
    items: [
      { href: '/dashboard/rgpd', label: 'RGPD', icon: ShieldAlert, exact: true },
      { href: '/dashboard/configuration/tva', label: 'Taux TVA', icon: Percent, exact: true },
      { href: '/dashboard/configuration', label: 'Configuration', icon: Settings, exact: true },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-60 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-14 items-center gap-2.5 border-b border-zinc-200 px-5 dark:border-zinc-800">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600">
          <Leaf className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Sous le Pommier
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {navGroups.map((group, i) => (
          <div key={i} className={cn('space-y-0.5', i > 0 && 'mt-4')}>
            {group.label && (
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {group.label}
              </p>
            )}
            {group.items.map(({ href, label, icon: Icon, exact }) => {
              const isActive = exact ? pathname === href : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
