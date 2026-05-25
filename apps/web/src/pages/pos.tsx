import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/auth'
import { POSInterface } from '@/components/pos/pos-interface'
import type { ProduitPOS } from '@/types/pos'
import type { ConfigTicket } from '@/types/ticket'

type ConfigApi = {
  raisonSociale: string
  siret?: string | null
  tvaIntracommunautaire?: string | null
  adresse?: string | null
  codePostal?: string | null
  ville?: string | null
  telephone?: string | null
}

export default function PosPage() {
  const { state } = useAuth()
  const user = state.status === 'authenticated' ? state.user : null

  const { data: produits = [], isLoading: l1 } = useQuery<ProduitPOS[]>({
    queryKey: ['produits', 'pos'],
    queryFn: () => api.get('/produits?actif=true&withVariantes=true'),
  })

  const { data: configRaw, isLoading: l2 } = useQuery<ConfigApi>({
    queryKey: ['config'],
    queryFn: () => api.get('/config'),
  })

  if (l1 || l2 || !user) {
    return <div className="bg-muted h-screen animate-pulse" />
  }

  const config: ConfigTicket = configRaw
    ? {
        raisonSociale: configRaw.raisonSociale,
        siret: configRaw.siret ?? null,
        tvaIntracommunautaire: configRaw.tvaIntracommunautaire ?? null,
        adresse: configRaw.adresse ?? null,
        codePostal: configRaw.codePostal ?? null,
        ville: configRaw.ville ?? null,
        telephone: configRaw.telephone ?? null,
      }
    : null

  return (
    <POSInterface
      produits={produits}
      user={{ id: user.id, prenom: user.prenom, nom: user.nom }}
      config={config}
    />
  )
}
