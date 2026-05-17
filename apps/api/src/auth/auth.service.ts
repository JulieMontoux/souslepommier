import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import type { JwtPayload } from '../common/decorators/current-user.decorator'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, nom: true, prenom: true, role: true, actif: true, passwordHash: true },
    })

    if (!user || !user.actif) throw new UnauthorizedException('Identifiants invalides')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Identifiants invalides')

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const { passwordHash: _, ...result } = user
    return result
  }

  login(user: { id: string; email: string; role: 'GERANT' | 'VENDEUR' }) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role }
    return {
      access_token: this.jwt.sign(payload),
      user: { id: user.id, email: user.email, role: user.role },
    }
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, nom: true, prenom: true, role: true, actif: true },
    })
    if (!user || !user.actif) throw new UnauthorizedException()
    return user
  }
}
