'use client'

import { useState, useEffect } from 'react'
import type { ConfigFormValues } from '@/lib/validations/config'

type Config = ConfigFormValues & { logoUrl?: string | null }

export function useConfig() {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => setConfig(data))
      .finally(() => setLoading(false))
  }, [])

  return { config, loading, setConfig }
}
