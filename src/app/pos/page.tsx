import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = { title: 'Caisse — Sous le Pommier' }

export default async function PosPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { prenom?: string; nom?: string; role?: string }

  return (
    <div className="flex h-screen flex-col bg-zinc-100">
      <header className="flex h-14 items-center justify-between bg-white px-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍎</span>
          <span className="font-semibold text-zinc-800">Caisse</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-600">
            {user.prenom} {user.nom}
          </span>
          <form action="/api/auth/signout" method="POST">
            <Button variant="ghost" size="sm" type="submit" className="gap-1.5 text-zinc-500">
              <LogOut className="h-4 w-4" />
              Quitter
            </Button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center">
        <p className="text-zinc-400">Interface caisse — disponible après l&apos;issue #10</p>
      </main>
    </div>
  )
}
