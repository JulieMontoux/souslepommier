import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export type JwtPayload = {
  sub: string
  email: string
  role: 'GERANT' | 'VENDEUR'
  iat?: number
  exp?: number
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>()
    return request.user
  },
)
