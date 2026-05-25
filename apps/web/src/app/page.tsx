import { connection } from 'next/server'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function Home() {
  await connection()
  const session = await auth()

  if (!session?.user) redirect('/login')

  const role = (session.user as { role?: string }).role
  redirect(role === 'GERANT' ? '/dashboard' : '/pos')
}
