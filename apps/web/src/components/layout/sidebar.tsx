'use client'

import { Link } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth'
import {
  LayoutDashboard,
  ShoppingBasket,
  Truck,
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
  Warehouse,
  Repeat2,
  MapPin,
  Tag,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  exact?: boolean
  superAdminOnly?: boolean
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
      { href: '/dashboard/stock', label: 'Stock', icon: Warehouse },
      { href: '/dashboard/abonnements', label: 'AMAP', icon: Repeat2 },
      { href: '/dashboard/clients', label: 'Clients', icon: Building2 },
      { href: '/dashboard/bons-livraison', label: 'Bons de livraison', icon: Truck },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { href: '/dashboard/points-de-vente', label: 'Points de vente', icon: MapPin },
      { href: '/dashboard/clotures', label: 'Clôtures', icon: Lock },
      { href: '/dashboard/statistiques', label: 'Statistiques', icon: BarChart3 },
      { href: '/dashboard/vendeurs', label: 'Vendeurs', icon: Users },
      { href: '/dashboard/audit', label: 'Audit', icon: ScrollText, superAdminOnly: true },
    ],
  },
  {
    label: 'Réglages',
    items: [
      { href: '/dashboard/rgpd', label: 'RGPD', icon: ShieldAlert, exact: true },
      { href: '/dashboard/configuration/tva', label: 'Taux TVA', icon: Percent, exact: true },
      { href: '/dashboard/configuration/categories', label: 'Catégories', icon: Tag, exact: true },
      { href: '/dashboard/configuration', label: 'Configuration', icon: Settings, exact: true },
    ],
  },
]

export function Sidebar() {
  const { pathname } = useLocation()
  const { state } = useAuth()
  const role = state.status === 'authenticated' ? state.user.role : null

  return (
    <aside className="border-sidebar-border bg-sidebar flex h-full w-60 shrink-0 flex-col border-r">
      <div className="border-sidebar-border flex h-14 shrink-0 items-center gap-3 border-b px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green-600 shadow-sm">
          <Leaf className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="text-sidebar-foreground text-sm leading-tight font-bold">
            Sous le Pommier
          </span>
          <p className="text-[10px] leading-tight font-medium text-green-600">Gestion de caisse</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group, i) => (
          <div key={i} className={cn(i > 0 && 'mt-6')}>
            {group.label && (
              <p className="mb-2 px-2 text-[10px] font-bold tracking-widest text-green-700/60 uppercase">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items
                .filter((item) => !item.superAdminOnly || role === 'SUPERADMIN')
                .map(({ href, label, icon: Icon, exact }) => {
                  const isActive = exact ? pathname === href : pathname.startsWith(href)
                  return (
                    <li key={href}>
                      <Link
                        to={href}
                        className={cn(
                          'relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150',
                          isActive
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm'
                            : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground font-normal'
                        )}
                      >
                        {isActive && (
                          <span className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-green-600" />
                        )}
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0',
                            isActive ? 'text-green-600' : 'text-sidebar-foreground/35'
                          )}
                        />
                        {label}
                      </Link>
                    </li>
                  )
                })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-sidebar-border border-t px-4 py-3">
        <p className="text-sidebar-foreground/30 text-center text-[10px]">
          v{new Date().getFullYear()}
        </p>
      </div>
    </aside>
  )
}
