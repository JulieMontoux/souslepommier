import Link from 'next/link'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
          <span>🍎</span>
          <span>Sous le Pommier</span>
        </Link>
      </header>
      <main>{children}</main>
      <footer className="border-t border-zinc-100 px-6 py-4 text-center text-xs text-zinc-400">
        © {new Date().getFullYear()} Sous le Pommier —{' '}
        <Link href="/legal/rgpd" className="underline hover:text-zinc-600">
          Politique de confidentialité
        </Link>
      </footer>
    </div>
  )
}
