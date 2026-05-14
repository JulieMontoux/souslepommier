import { auth } from '@/lib/auth'

export const metadata = { title: 'Tableau de bord — Sous le Pommier' }

export default async function DashboardPage() {
  const session = await auth()
  const user = session?.user as { prenom?: string }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Bonjour, {user?.prenom ?? 'Gérant'} 👋</h1>
        <p className="text-sm text-zinc-500">
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'CA du jour', value: '—', sub: 'TTC' },
          { label: 'Ventes', value: '—', sub: "aujourd'hui" },
          { label: 'Panier moyen', value: '—', sub: 'TTC' },
          { label: 'Produits actifs', value: '—', sub: 'en catalogue' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
            <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-zinc-500">
          Les statistiques seront disponibles après l&apos;implémentation des issues #9 et #19.
        </p>
      </div>
    </div>
  )
}
