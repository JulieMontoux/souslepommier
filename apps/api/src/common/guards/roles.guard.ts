import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import type { JwtPayload } from '../decorators/current-user.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<('GERANT' | 'VENDEUR')[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required) return true

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>()
    if (!required.includes(user.role)) throw new ForbiddenException('Accès refusé')
    return true
  }
}
