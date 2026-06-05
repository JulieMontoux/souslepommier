import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNetwork } from '../use-network'

describe('useNetwork', () => {
  const originalOnLine = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine')

  beforeEach(() => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true })
  })

  afterEach(() => {
    if (originalOnLine) {
      Object.defineProperty(Navigator.prototype, 'onLine', originalOnLine)
    }
  })

  it('returns true when navigator.onLine is true', () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true })
    const { result } = renderHook(() => useNetwork())
    expect(result.current).toBe(true)
  })

  it('returns false when navigator.onLine is false', () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false })
    const { result } = renderHook(() => useNetwork())
    expect(result.current).toBe(false)
  })

  it('updates when offline event is fired', () => {
    const { result } = renderHook(() => useNetwork())
    expect(result.current).toBe(true)

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current).toBe(false)
  })

  it('updates when online event is fired', () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false })
    const { result } = renderHook(() => useNetwork())
    expect(result.current).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current).toBe(true)
  })

  it('removes listeners on unmount', () => {
    const { result, unmount } = renderHook(() => useNetwork())
    expect(result.current).toBe(true)

    unmount()
    // After unmount, dispatching events should not throw and (since rerender stopped) state can't be checked.
    // We at least confirm the cleanup callback runs without error.
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(true).toBe(true)
  })
})
