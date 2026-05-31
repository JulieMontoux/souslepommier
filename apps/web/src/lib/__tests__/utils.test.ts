import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn (classname utility)', () => {
  it('merges class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    const condition = false
    expect(cn('base', condition && 'hidden', 'visible')).toBe('base visible')
  })

  it('tailwind: later class wins over earlier conflicting class', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('handles undefined and null', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b')
  })

  it('handles object syntax', () => {
    expect(cn({ active: true, hidden: false })).toBe('active')
  })

  it('handles array syntax', () => {
    expect(cn(['a', 'b'])).toBe('a b')
  })

  it('returns empty string for no args', () => {
    expect(cn()).toBe('')
  })
})
