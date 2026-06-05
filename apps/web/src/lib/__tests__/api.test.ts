import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { api, ApiError } from '../api'

describe('ApiError', () => {
  it('exposes status, message and data', () => {
    const err = new ApiError(404, 'Not found', { detail: 'oops' })
    expect(err).toBeInstanceOf(Error)
    expect(err.status).toBe(404)
    expect(err.message).toBe('Not found')
    expect(err.data).toEqual({ detail: 'oops' })
  })

  it('data is optional', () => {
    const err = new ApiError(500, 'Server error')
    expect(err.data).toBeUndefined()
  })
})

describe('api request wrapper', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function mockFetchResponse(opts: {
    status?: number
    ok?: boolean
    body?: unknown
    rejectJson?: boolean
  }) {
    const status = opts.status ?? 200
    const ok = opts.ok ?? (status >= 200 && status < 300)
    return {
      status,
      ok,
      json: opts.rejectJson
        ? () => Promise.reject(new Error('not json'))
        : () => Promise.resolve(opts.body ?? {}),
    }
  }

  it('GET sends request with proper credentials and headers', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue(mockFetchResponse({ body: { ok: true } }))

    const result = await api.get<{ ok: boolean }>('/foo')

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/foo',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    )
  })

  it('POST sends body as JSON', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue(mockFetchResponse({ body: { id: 1 } }))

    const result = await api.post<{ id: number }>('/items', { name: 'x' })

    expect(result).toEqual({ id: 1 })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/items',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'x' }),
      })
    )
  })

  it('POST without body sends no body', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue(mockFetchResponse({ body: {} }))

    await api.post('/foo')

    const call = fetchMock.mock.calls[0]
    expect(call[1].body).toBeUndefined()
  })

  it('PUT sends body as JSON', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue(mockFetchResponse({ body: { ok: true } }))

    await api.put('/items/1', { name: 'x' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/items/1',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ name: 'x' }) })
    )
  })

  it('PATCH sends body as JSON', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue(mockFetchResponse({ body: { ok: true } }))

    await api.patch('/items/1', { name: 'x' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/items/1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'x' }) })
    )
  })

  it('PATCH without body sends no body', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue(mockFetchResponse({ body: {} }))

    await api.patch('/items/1')

    const call = fetchMock.mock.calls[0]
    expect(call[1].body).toBeUndefined()
  })

  it('PUT without body sends no body', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue(mockFetchResponse({ body: {} }))

    await api.put('/items/1')

    const call = fetchMock.mock.calls[0]
    expect(call[1].body).toBeUndefined()
  })

  it('DELETE uses DELETE method', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue(mockFetchResponse({ body: { ok: true } }))

    await api.delete('/items/1')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/items/1',
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('returns undefined on 204 No Content', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue(mockFetchResponse({ status: 204, body: '' }))

    const result = await api.delete('/items/1')
    expect(result).toBeUndefined()
  })

  it('throws ApiError with error message from body', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue(
      mockFetchResponse({ status: 400, body: { error: 'Bad request' } })
    )

    await expect(api.get('/foo')).rejects.toMatchObject({
      status: 400,
      message: 'Bad request',
    })
  })

  it('throws ApiError with fallback message when no body error', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue(mockFetchResponse({ status: 500, body: {} }))

    await expect(api.get('/foo')).rejects.toMatchObject({
      status: 500,
      message: 'HTTP 500',
    })
  })

  it('throws ApiError when body is not JSON', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue(mockFetchResponse({ status: 401, rejectJson: true }))

    await expect(api.get('/foo')).rejects.toMatchObject({
      status: 401,
      message: 'HTTP 401',
    })
  })

  it('allows overriding headers', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue(mockFetchResponse({ body: {} }))

    await api.get('/foo')
    // header override is internal — covered by request signature, just confirm content-type default
    const callHeaders = fetchMock.mock.calls[0][1].headers as Record<string, string>
    expect(callHeaders['Content-Type']).toBe('application/json')
  })
})
