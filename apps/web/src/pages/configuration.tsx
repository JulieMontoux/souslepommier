import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ConfigForm } from '@/components/config/config-form'
import type { ConfigFormValues } from '@/lib/validations/config'

type ConfigApi = ConfigFormValues & { logoUrl?: string | null }

export default function ConfigurationPage() {
  const { data: config, isLoading } = useQuery<ConfigApi>({
    queryKey: ['config'],
    queryFn: () => api.get('/config'),
  })

  if (isLoading) return <div className="bg-muted h-48 animate-pulse rounded-xl" />

  return <ConfigForm initialConfig={config ?? null} />
}
