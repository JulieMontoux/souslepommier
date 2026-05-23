import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { VentesService } from '../ventes/ventes.service'
import { PrismaService } from '../prisma/prisma.service'

const mockPrisma = {
  vente: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  clotureCaisse: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
}

describe('VentesService', () => {
  let service: VentesService

  beforeEach(async () => {
    process.env.SIGNING_SECRET = 'test-secret'
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VentesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<VentesService>(VentesService)
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('retourne les ventes paginées', async () => {
      mockPrisma.vente.count.mockResolvedValue(5)
      mockPrisma.vente.findMany.mockResolvedValue([{ id: 'v1' }])

      const result = await service.findAll(1, 10)
      expect(result.data).toHaveLength(1)
      expect(result.meta.total).toBe(5)
      expect(result.meta.totalPages).toBe(1)
    })

    it('calcule correctement le skip', async () => {
      mockPrisma.vente.count.mockResolvedValue(100)
      mockPrisma.vente.findMany.mockResolvedValue([])
      await service.findAll(3, 20)
      expect(mockPrisma.vente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 })
      )
    })

    it('filtre par vendeurId', async () => {
      mockPrisma.vente.count.mockResolvedValue(2)
      mockPrisma.vente.findMany.mockResolvedValue([])
      await service.findAll(1, 10, 'user-1')
      expect(mockPrisma.vente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ vendeurId: 'user-1' }) })
      )
    })

    it('filtre par plage de dates', async () => {
      mockPrisma.vente.count.mockResolvedValue(0)
      mockPrisma.vente.findMany.mockResolvedValue([])
      await service.findAll(1, 10, undefined, '2026-05-01', '2026-05-31')
      expect(mockPrisma.vente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ date: expect.any(Object) }) })
      )
    })

    it('filtre par statut', async () => {
      mockPrisma.vente.count.mockResolvedValue(0)
      mockPrisma.vente.findMany.mockResolvedValue([])
      await service.findAll(1, 10, undefined, undefined, undefined, 'FINALISEE')
      expect(mockPrisma.vente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ statut: 'FINALISEE' }) })
      )
    })
  })

  describe('findOne', () => {
    it('retourne la vente si trouvée', async () => {
      mockPrisma.vente.findUnique.mockResolvedValue({ id: 'v1', numeroTicket: 'T-2026-000001' })
      const result = await service.findOne('v1')
      expect(result.id).toBe('v1')
    })

    it('lève NotFoundException si vente introuvable', async () => {
      mockPrisma.vente.findUnique.mockResolvedValue(null)
      await expect(service.findOne('nope')).rejects.toThrow(NotFoundException)
    })
  })

  describe('findToday', () => {
    it('retourne les ventes du jour pour un GERANT', async () => {
      mockPrisma.vente.findMany.mockResolvedValue([{ id: 'v1' }])
      const result = await service.findToday('user-1', 'GERANT')
      expect(result).toHaveLength(1)
      const callArg = mockPrisma.vente.findMany.mock.calls[0][0]
      expect(callArg.where).not.toHaveProperty('vendeurId')
    })

    it('filtre par vendeurId pour un VENDEUR', async () => {
      mockPrisma.vente.findMany.mockResolvedValue([])
      await service.findToday('user-1', 'VENDEUR')
      const callArg = mockPrisma.vente.findMany.mock.calls[0][0]
      expect(callArg.where.vendeurId).toBe('user-1')
    })
  })

  describe('create', () => {
    const dto = {
      vendeurId: 'user-1',
      totalHT: 10,
      totalTVA: 0.55,
      totalTTC: 10.55,
      lignes: [
        { varianteProduitId: 'var-1', qte: 1, prixUnitaireHT: 10, tauxTVA: 5.5 },
      ],
      paiements: [{ mode: 'CB', montant: 10.55 }],
    }

    it('lève ConflictException si caisse clôturée', async () => {
      mockPrisma.clotureCaisse.findFirst.mockResolvedValue({ id: 'c1' })
      await expect(service.create(dto)).rejects.toThrow(ConflictException)
    })

    it('crée la vente dans une transaction', async () => {
      mockPrisma.clotureCaisse.findFirst.mockResolvedValue(null)
      mockPrisma.vente.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
      const mockVente = { id: 'v1', numeroTicket: 'T-2026-000001' }
      mockPrisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
        fn({ vente: { create: jest.fn().mockResolvedValue(mockVente) } })
      )
      const result = await service.create(dto)
      expect(result.id).toBe('v1')
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('génère un numeroTicket séquentiel', async () => {
      mockPrisma.clotureCaisse.findFirst.mockResolvedValue(null)
      mockPrisma.vente.findFirst
        .mockResolvedValueOnce({ numeroTicket: 'T-2026-000005' })
        .mockResolvedValueOnce(null)
      const mockVente = { id: 'v1', numeroTicket: 'T-2026-000006' }
      mockPrisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
        fn({ vente: { create: jest.fn().mockResolvedValue(mockVente) } })
      )
      await service.create(dto)
      const txFn = mockPrisma.$transaction.mock.calls[0][0]
      const mockTx = { vente: { create: jest.fn().mockResolvedValue(mockVente) } }
      await txFn(mockTx)
      const createCall = mockTx.vente.create.mock.calls[0][0]
      expect(createCall.data.numeroTicket).toBe('T-2026-000006')
    })
  })

  describe('annuler', () => {
    it('annule une vente finalisée', async () => {
      mockPrisma.vente.findUnique.mockResolvedValue({ id: 'v1', statut: 'FINALISEE' })
      mockPrisma.vente.update.mockResolvedValue({ id: 'v1', statut: 'ANNULEE' })
      const result = await service.annuler('v1', { motif: 'Erreur' }, 'user-1')
      expect(mockPrisma.vente.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ statut: 'ANNULEE' }) })
      )
      expect(result.statut).toBe('ANNULEE')
    })

    it('lève NotFoundException si vente introuvable', async () => {
      mockPrisma.vente.findUnique.mockResolvedValue(null)
      await expect(service.annuler('nope', { motif: 'test' }, 'user-1')).rejects.toThrow(
        NotFoundException
      )
    })

    it('lève BadRequestException si vente non finalisée', async () => {
      mockPrisma.vente.findUnique.mockResolvedValue({ id: 'v1', statut: 'ANNULEE' })
      await expect(service.annuler('v1', { motif: 'test' }, 'user-1')).rejects.toThrow(
        BadRequestException
      )
    })
  })
})
