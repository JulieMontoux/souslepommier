import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session?.user
  const role = (session?.user as { role?: string })?.role
  const path = nextUrl.pathname

  const isDashboard = path.startsWith('/dashboard')
  const isPos = path.startsWith('/pos')
  const isLogin = path === '/login'

  // Redirection si déjà connecté et sur login
  if (isLogin && isLoggedIn) {
    return NextResponse.redirect(new URL(role === 'GERANT' ? '/dashboard' : '/pos', nextUrl))
  }

  // Protection routes authentifiées
  if ((isDashboard || isPos) && !isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl)
    loginUrl.searchParams.set('callbackUrl', path)
    return NextResponse.redirect(loginUrl)
  }

  // VENDEUR interdit sur dashboard
  if (isDashboard && isLoggedIn && role !== 'GERANT') {
    return NextResponse.redirect(new URL('/pos', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)'],
}
