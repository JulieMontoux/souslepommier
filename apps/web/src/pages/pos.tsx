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
    queryFn: async () => {
      const raw: Record<string, unknown>[] = await api.get(
        '/produits?actif=true&withVariantes=true'
      )
      return raw.map((p) => ({
        id: p.id as string,
        nom: p.nom as string,
        description: (p.description as string | null) ?? null,
        categorieNom: (p.categorie as { nom: string } | null)?.nom ?? null,
        variantes: ((p.variantes as Record<string, unknown>[]) ?? [])
          .filter((v) => v.actif)
          .map((v) => ({
            id: v.id as string,
            poids: v.poids != null ? Number(v.poids) : null,
            emballage: v.emballage as string,
            prixHT: Number(v.prixHT),
            tauxTVA: Number(v.tauxTVA),
            prixTTC: Number(v.prixTTC),
          })),
      }))
    },
  })

  const { data: configRaw, isLoading: l2 } = useQuery<ConfigApi>({
    queryKey: ['config'],
    queryFn: () => api.get('/config'),
  })

  const {
    data: clotureStatut,
    isLoading: l3,
    refetch: refetchStatut,
  } = useQuery({
    queryKey: ['caisse-statut'],
    queryFn: async () => {
      const res = await fetch('/api/clotures/apercu')
      if (res.status === 409) return { isCloturee: true }
      return { isCloturee: false }
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  if (l1 || l2 || l3 || !user) {
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
      user={{ id: user.id, prenom: user.prenom, nom: user.nom, role: user.role }}
      config={config}
      isCloturee={clotureStatut?.isCloturee ?? false}
      onReouverture={() => refetchStatut()}
    />
  )
}
