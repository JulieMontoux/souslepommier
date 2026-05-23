import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, ConflictException } from '@nestjs/common'
import { ClientsService } from '../clients/clients.service'
import { PrismaService } from '../prisma/prisma.service'

const mockClient = {
  id: 'c1',
  raisonSociale: 'SARL Les Pommes',
  siret: '12345678901234',
  email: 'contact@pommes.fr',
  actif: true,
  factures: [],
}

const mockPrisma = {
  client: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}

describe('ClientsService', () => {
  let service: ClientsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<ClientsService>(ClientsService)
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('retourne tous les clients sans filtre', async () => {
      mockPrisma.client.findMany.mockResolvedValue([mockClient])
      const result = await service.findAll()
      expect(result).toHaveLength(1)
    })

    it('filtre par recherche', async () => {
      mockPrisma.client.findMany.mockResolvedValue([])
      await service.findAll('pomme')
      expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) })
      )
    })

    it('filtre par statut actif', async () => {
      mockPrisma.client.findMany.mockResolvedValue([])
      await service.findAll(undefined, false)
      expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ actif: false }) })
      )
    })
  })

  describe('findOne', () => {
    it('retourne le client avec ses factures', async () => {
      mockPrisma.client.findUnique.mockResolvedValue(mockClient)
      const result = await service.findOne('c1')
      expect(result.id).toBe('c1')
    })

    it('lève NotFoundException si client introuvable', async () => {
      mockPrisma.client.findUnique.mockResolvedValue(null)
      await expect(service.findOne('nope')).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('crée un client sans SIRET', async () => {
      mockPrisma.client.create.mockResolvedValue({ ...mockClient, id: 'c-new', siret: null })
      const result = await service.create({ raisonSociale: 'Nouveau Client' })
      expect(result.id).toBe('c-new')
      expect(mockPrisma.client.findUnique).not.toHaveBeenCalled()
    })

    it('vérifie l\'unicité du SIRET à la création', async () => {
      mockPrisma.client.findUnique.mockResolvedValue(mockClient)
      await expect(
        service.create({ raisonSociale: 'Autre', siret: '12345678901234' })
      ).rejects.toThrow(ConflictException)
    })

    it('crée un client si SIRET est unique', async () => {
      mockPrisma.client.findUnique.mockResolvedValue(null)
      mockPrisma.client.create.mockResolvedValue({ ...mockClient, id: 'c-new2' })
      await service.create({ raisonSociale: 'Nouveau', siret: '99999999999999' })
      expect(mockPrisma.client.create).toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('met à jour le client si trouvé', async () => {
      mockPrisma.client.findUnique.mockResolvedValue(mockClient)
      mockPrisma.client.update.mockResolvedValue({ ...mockClient, raisonSociale: 'Modifié' })
      const result = await service.update('c1', { raisonSociale: 'Modifié' })
      expect(result.raisonSociale).toBe('Modifié')
    })

    it('lève NotFoundException si client introuvable', async () => {
      mockPrisma.client.findUnique.mockResolvedValue(null)
      await expect(service.update('nope', { raisonSociale: 'x' })).rejects.toThrow(NotFoundException)
    })
  })
})
