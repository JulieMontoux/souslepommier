'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  LayoutDashboard,
  Package,
  ShoppingBasket,
  Building2,
  FileText,
  Lock,
  BarChart3,
  Users,
  ScrollText,
  ShieldAlert,
  Percent,
  Settings,
  Search,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, group: 'Navigation' },
  { href: '/dashboard/produits', label: 'Produits', icon: Package, group: 'Navigation' },
  { href: '/dashboard/ventes', label: 'Ventes', icon: ShoppingBasket, group: 'Navigation' },
  { href: '/dashboard/clients', label: 'Clients', icon: Building2, group: 'Navigation' },
  { href: '/dashboard/factures', label: 'Factures', icon: FileText, group: 'Navigation' },
  { href: '/dashboard/clotures', label: 'Clôtures', icon: Lock, group: 'Navigation' },
  { href: '/dashboard/statistiques', label: 'Statistiques', icon: BarChart3, group: 'Navigation' },
  { href: '/dashboard/vendeurs', label: 'Vendeurs', icon: Users, group: 'Navigation' },
  { href: '/dashboard/audit', label: "Journal d'audit", icon: ScrollText, group: 'Navigation' },
  { href: '/dashboard/rgpd', label: 'RGPD', icon: ShieldAlert, group: 'Configuration' },
  {
    href: '/dashboard/configuration/tva',
    label: 'Taux TVA',
    icon: Percent,
    group: 'Configuration',
  },
  {
    href: '/dashboard/configuration',
    label: 'Configuration',
    icon: Settings,
    group: 'Configuration',
  },
  { href: '/pos', label: 'Point de vente (POS)', icon: ShoppingBasket, group: 'Actions' },
  {
    href: '/dashboard/factures/nouvelle',
    label: 'Nouvelle facture',
    icon: FileText,
    group: 'Actions',
  },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const toggle = useCallback(() => setOpen((o) => !o), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [toggle])

  function navigate(href: string) {
    router.push(href)
    setOpen(false)
  }

  const groups = Array.from(new Set(NAV_ITEMS.map((i) => i.group)))

  return (
    <>
      <button
        onClick={toggle}
        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-500 shadow-xs transition-colors hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Rechercher…</span>
        <kbd className="ml-1 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[20vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <Command
            className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center border-b border-zinc-100 px-4 dark:border-zinc-800">
              <Search className="mr-3 h-4 w-4 shrink-0 text-zinc-400" />
              <Command.Input
                autoFocus
                placeholder="Chercher une page…"
                className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-zinc-400 dark:text-zinc-100"
              />
            </div>
            <Command.List className="max-h-72 overflow-y-auto p-2">
              <Command.Empty className="px-4 py-6 text-center text-sm text-zinc-500">
                Aucun résultat.
              </Command.Empty>
              {groups.map((group) => (
                <Command.Group
                  key={group}
                  heading={group}
                  className="[&_[cmdk-group-heading]]:mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-400"
                >
                  {NAV_ITEMS.filter((i) => i.group === group).map((item) => (
                    <Command.Item
                      key={item.href}
                      value={item.label}
                      onSelect={() => navigate(item.href)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-700 aria-selected:bg-zinc-100 dark:text-zinc-300 dark:aria-selected:bg-zinc-800"
                    >
                      <item.icon className="h-4 w-4 text-zinc-400" />
                      {item.label}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </div>
      )}
    </>
  )
}
