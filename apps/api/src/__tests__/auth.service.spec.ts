import { Test, TestingModule } from '@nestjs/testing'
import { UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { AuthService } from '../auth/auth.service'
import { PrismaService } from '../prisma/prisma.service'

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
}

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    jest.clearAllMocks()
  })

  describe('validateUser', () => {
    const passwordHash = bcrypt.hashSync('secret123', 10)
    const mockUser = {
      id: 'user-1',
      email: 'alice@example.com',
      nom: 'Durand',
      prenom: 'Alice',
      role: 'GERANT' as const,
      actif: true,
      passwordHash,
    }

    it('retourne l\'utilisateur sans passwordHash si credentials valides', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.user.update.mockResolvedValue({})

      const result = await service.validateUser('alice@example.com', 'secret123')
      expect(result).not.toHaveProperty('passwordHash')
      expect(result.email).toBe('alice@example.com')
      expect(result.role).toBe('GERANT')
    })

    it('lève UnauthorizedException si utilisateur introuvable', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      await expect(service.validateUser('nope@example.com', 'pw')).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('lève UnauthorizedException si utilisateur inactif', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, actif: false })
      await expect(service.validateUser('alice@example.com', 'secret123')).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('lève UnauthorizedException si mot de passe incorrect', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      await expect(service.validateUser('alice@example.com', 'wrong')).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('met à jour lastLoginAt après validation réussie', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.user.update.mockResolvedValue({})

      await service.validateUser('alice@example.com', 'secret123')
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
        })
      )
    })
  })

  describe('login', () => {
    it('retourne un access_token et les infos utilisateur', () => {
      const user = { id: 'user-1', email: 'alice@example.com', role: 'GERANT' as const }
      const result = service.login(user)
      expect(result.access_token).toBe('mock-jwt-token')
      expect(result.user.email).toBe('alice@example.com')
      expect(result.user.role).toBe('GERANT')
    })

    it('signe le JWT avec le bon payload', () => {
      const user = { id: 'user-1', email: 'alice@example.com', role: 'VENDEUR' as const }
      service.login(user)
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1', email: 'alice@example.com', role: 'VENDEUR' })
      )
    })
  })

  describe('me', () => {
    it('retourne les informations de l\'utilisateur actif', async () => {
      const mockUser = { id: 'user-1', email: 'alice@example.com', nom: 'Durand', prenom: 'Alice', role: 'GERANT', actif: true }
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      const result = await service.me('user-1')
      expect(result.email).toBe('alice@example.com')
    })

    it('lève UnauthorizedException si utilisateur introuvable', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      await expect(service.me('nope')).rejects.toThrow(UnauthorizedException)
    })

    it('lève UnauthorizedException si utilisateur inactif', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', actif: false })
      await expect(service.me('u1')).rejects.toThrow(UnauthorizedException)
    })
  })
})
