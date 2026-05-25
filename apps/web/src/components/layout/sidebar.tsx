'use client'

import { Link } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
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
  const { pathname } = useLocation()

  return (
    <aside className="border-sidebar-border bg-sidebar flex h-full w-56 shrink-0 flex-col border-r">
      <div className="border-sidebar-border flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-500">
          <Leaf className="h-4 w-4 text-white" />
        </div>
        <span className="text-sidebar-foreground text-sm font-semibold tracking-tight">
          Sous le Pommier
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {navGroups.map((group, i) => (
          <div key={i} className={cn('mb-1', i > 0 && 'mt-4')}>
            {group.label && (
              <p className="text-sidebar-foreground/40 mb-1 px-2 text-[10px] font-semibold tracking-widest uppercase">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, exact }) => {
                const isActive = exact ? pathname === href : pathname.startsWith(href)
                return (
                  <li key={href}>
                    <Link
                      to={href}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-green-600')} />
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
