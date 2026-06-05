import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  enqueueVente,
  getOfflineVentes,
  removeOfflineVente,
  syncOfflineVentes,
} from '../offline-queue'

async function clearStore() {
  // Drain the queue without recreating the DB. Avoids the "blocked" deletion problem.
  const ventes = await getOfflineVentes()
  for (const v of ventes) {
    await removeOfflineVente(v.localId)
  }
}

describe('offline-queue', () => {
  beforeEach(async () => {
    await clearStore()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    await clearStore()
  })

  describe('enqueueVente', () => {
    it('returns a generated localId starting with "offline-"', async () => {
      const id = await enqueueVente({ total: 10 })
      expect(id).toMatch(/^offline-\d+-/)
    })

    it('stores the payload that can be retrieved', async () => {
      const id = await enqueueVente({ total: 12.5, ref: 'A' })
      const list = await getOfflineVentes()
      expect(list).toHaveLength(1)
      expect(list[0].localId).toBe(id)
      expect(list[0].payload).toEqual({ total: 12.5, ref: 'A' })
      expect(typeof list[0].createdAt).toBe('string')
    })
  })

  describe('getOfflineVentes', () => {
    it('returns empty array when no records', async () => {
      const list = await getOfflineVentes()
      expect(list).toEqual([])
    })

    it('returns all enqueued ventes', async () => {
      await enqueueVente({ a: 1 })
      await enqueueVente({ b: 2 })
      const list = await getOfflineVentes()
      expect(list).toHaveLength(2)
    })
  })

  describe('removeOfflineVente', () => {
    it('removes the specified vente', async () => {
      const id1 = await enqueueVente({ a: 1 })
      await enqueueVente({ b: 2 })
      await removeOfflineVente(id1)
      const list = await getOfflineVentes()
      expect(list).toHaveLength(1)
      expect(list[0].payload).toEqual({ b: 2 })
    })
  })

  describe('syncOfflineVentes', () => {
    it('returns 0/0 when queue is empty', async () => {
      const result = await syncOfflineVentes()
      expect(result).toEqual({ synced: 0, failed: 0 })
    })

    it('syncs and removes successful ventes', async () => {
      await enqueueVente({ a: 1 })
      await enqueueVente({ b: 2 })

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValue({ ok: true, status: 200 })

      const result = await syncOfflineVentes()
      expect(result).toEqual({ synced: 2, failed: 0 })

      const remaining = await getOfflineVentes()
      expect(remaining).toHaveLength(0)
    })

    it('treats 409 as success (duplicate)', async () => {
      await enqueueVente({ a: 1 })

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValue({ ok: false, status: 409 })

      const result = await syncOfflineVentes()
      expect(result).toEqual({ synced: 1, failed: 0 })
    })

    it('counts non-ok non-409 responses as failed', async () => {
      await enqueueVente({ a: 1 })

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValue({ ok: false, status: 500 })

      const result = await syncOfflineVentes()
      expect(result).toEqual({ synced: 0, failed: 1 })
      const remaining = await getOfflineVentes()
      expect(remaining).toHaveLength(1)
    })

    it('counts thrown errors as failed', async () => {
      await enqueueVente({ a: 1 })

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      fetchMock.mockRejectedValue(new Error('network down'))

      const result = await syncOfflineVentes()
      expect(result).toEqual({ synced: 0, failed: 1 })
    })

    it('mixes synced and failed', async () => {
      await enqueueVente({ a: 1 })
      await enqueueVente({ b: 2 })

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValueOnce({ ok: true, status: 200 })
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500 })

      const result = await syncOfflineVentes()
      expect(result.synced + result.failed).toBe(2)
    })

    it('sends the right payload and url', async () => {
      await enqueueVente({ foo: 'bar' })

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValue({ ok: true, status: 200 })

      await syncOfflineVentes()
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/ventes',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ foo: 'bar' }),
        })
      )
    })
  })
})
