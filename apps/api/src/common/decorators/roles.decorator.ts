import { SetMetadata } from '@nestjs/common'

export const ROLES_KEY = 'roles'
export const Roles = (...roles: ('GERANT' | 'VENDEUR')[]) => SetMetadata(ROLES_KEY, roles)
