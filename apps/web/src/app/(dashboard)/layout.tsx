import { connection } from 'next/server'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await connection()
  const session = await auth()

  if (!session?.user) redirect('/login')

  // VENDEUR redirigé vers POS
  if ((session.user as { role?: string }).role !== 'GERANT') {
    redirect('/pos')
  }

  const user = session.user as { nom: string; prenom: string; role: string; email: string }

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
