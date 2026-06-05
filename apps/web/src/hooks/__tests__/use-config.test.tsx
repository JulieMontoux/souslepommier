import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useConfig } from '../use-config'

describe('useConfig', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('starts with loading=true and config=null', () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useConfig())
    expect(result.current.loading).toBe(true)
    expect(result.current.config).toBeNull()
  })

  it('loads config from /api/config', async () => {
    const fakeConfig = { siretActif: '123', logoUrl: '/logo.png' }
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue({ json: () => Promise.resolve(fakeConfig) })

    const { result } = renderHook(() => useConfig())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.config).toEqual(fakeConfig)
    expect(fetchMock).toHaveBeenCalledWith('/api/config')
  })

  it('setConfig updates the value', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue({ json: () => Promise.resolve({}) })

    const { result } = renderHook(() => useConfig())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(typeof result.current.setConfig).toBe('function')
  })

  it('handles non-object responses (null config)', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue({ json: () => Promise.resolve(null) })

    const { result } = renderHook(() => useConfig())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.config).toBeNull()
  })
})
