import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'

const SESSION_MAX_AGE = parseInt(process.env.SESSION_MAX_AGE ?? '28800') // 8h

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
})

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE,
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isDashboard = nextUrl.pathname.startsWith('/dashboard')
      const isPos = nextUrl.pathname.startsWith('/pos')
      const isLogin = nextUrl.pathname === '/login'

      if (isLogin && isLoggedIn) {
        const role = (auth?.user as { role?: string })?.role
        return Response.redirect(new URL(role === 'GERANT' ? '/dashboard' : '/pos', nextUrl))
      }
      if (isDashboard || isPos) return isLoggedIn
      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
        token.nom = (user as { nom?: string }).nom
        token.prenom = (user as { prenom?: string }).prenom
      }
      return token
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.nom = token.nom as string
        session.user.prenom = token.prenom as string
      }
      return session
    },
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password, ip, userAgent } = parsed.data
        const rateLimitKey = `login:${ip ?? email}`

        const rateCheck = checkRateLimit(rateLimitKey)
        if (!rateCheck.allowed) {
          await logAudit({
            action: 'LOGIN_BLOCKED',
            entite: 'User',
            nouvelleValeur: { email },
            ip,
            userAgent,
          })
          throw new Error('RATE_LIMITED')
        }

        const user = await prisma.user.findUnique({ where: { email } })

        if (!user || !user.actif) {
          await logAudit({
            action: 'LOGIN_FAILED',
            entite: 'User',
            nouvelleValeur: { email, reason: !user ? 'user_not_found' : 'user_inactive' },
            ip,
            userAgent,
          })
          return null
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash)
        if (!passwordValid) {
          await logAudit({
            userId: user.id,
            action: 'LOGIN_FAILED',
            entite: 'User',
            entiteId: user.id,
            nouvelleValeur: { reason: 'invalid_password' },
            ip,
            userAgent,
          })
          return null
        }

        resetRateLimit(rateLimitKey)
        await Promise.all([
          prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
          logAudit({
            userId: user.id,
            action: 'LOGIN_SUCCESS',
            entite: 'User',
            entiteId: user.id,
            ip,
            userAgent,
          }),
        ])

        return {
          id: user.id,
          email: user.email,
          name: `${user.prenom} ${user.nom}`,
          role: user.role,
          nom: user.nom,
          prenom: user.prenom,
        }
      },
    }),
  ],
}
