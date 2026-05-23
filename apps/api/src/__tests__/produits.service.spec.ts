import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { ProduitsService } from '../produits/produits.service'
import { PrismaService } from '../prisma/prisma.service'

const mockProduit = {
  id: 'p1',
  nom: 'Pomme',
  actif: true,
  categorieId: 'cat-1',
  description: null,
  image: null,
  categorie: { id: 'cat-1', nom: 'Fruits' },
  variantes: [],
}

const mockPrisma = {
  produit: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  varianteProduit: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}

describe('ProduitsService', () => {
  let service: ProduitsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProduitsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<ProduitsService>(ProduitsService)
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('retourne tous les produits sans filtre', async () => {
      mockPrisma.produit.findMany.mockResolvedValue([mockProduit])
      const result = await service.findAll()
      expect(result).toHaveLength(1)
      expect(mockPrisma.produit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} })
      )
    })

    it('filtre par recherche', async () => {
      mockPrisma.produit.findMany.mockResolvedValue([])
      await service.findAll('pomme')
      expect(mockPrisma.produit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ nom: expect.objectContaining({ contains: 'pomme' }) }),
        })
      )
    })

    it('filtre par categorieId', async () => {
      mockPrisma.produit.findMany.mockResolvedValue([])
      await service.findAll(undefined, 'cat-1')
      expect(mockPrisma.produit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categorieId: 'cat-1' }),
        })
      )
    })

    it('filtre par statut actif', async () => {
      mockPrisma.produit.findMany.mockResolvedValue([])
      await service.findAll(undefined, undefined, true)
      expect(mockPrisma.produit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ actif: true }),
        })
      )
    })
  })

  describe('findOne', () => {
    it('retourne le produit si trouvé', async () => {
      mockPrisma.produit.findUnique.mockResolvedValue(mockProduit)
      const result = await service.findOne('p1')
      expect(result.id).toBe('p1')
    })

    it('lève NotFoundException si produit introuvable', async () => {
      mockPrisma.produit.findUnique.mockResolvedValue(null)
      await expect(service.findOne('nope')).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('crée un produit avec les données fournies', async () => {
      mockPrisma.produit.create.mockResolvedValue({ ...mockProduit, id: 'p-new' })
      const result = await service.create({ nom: 'Pomme', categorieId: 'cat-1' })
      expect(mockPrisma.produit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ nom: 'Pomme' }),
        })
      )
      expect(result.id).toBe('p-new')
    })
  })

  describe('update', () => {
    it('met à jour le produit si trouvé', async () => {
      mockPrisma.produit.findUnique.mockResolvedValue(mockProduit)
      mockPrisma.produit.update.mockResolvedValue({ ...mockProduit, nom: 'Pomme Bio' })
      const result = await service.update('p1', { nom: 'Pomme Bio' })
      expect(result.nom).toBe('Pomme Bio')
    })

    it('lève NotFoundException si produit introuvable', async () => {
      mockPrisma.produit.findUnique.mockResolvedValue(null)
      await expect(service.update('nope', { nom: 'test' })).rejects.toThrow(NotFoundException)
    })
  })
})
