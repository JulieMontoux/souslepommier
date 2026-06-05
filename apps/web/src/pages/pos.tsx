import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/auth'
import { POSInterface } from '@/components/pos/pos-interface'
import type { ProduitPOS } from '@/types/pos'
import type { ConfigTicket } from '@/types/ticket'

const PDV_STORAGE_KEY = 'pos_pdv_id'

type PointDeVente = { id: string; nom: string; actif: boolean }
type ClientPOS = { id: string; raisonSociale: string }

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
  const [selectedPdvId, setSelectedPdvId] = useState<string>(
    () => localStorage.getItem(PDV_STORAGE_KEY) ?? ''
  )

  const { data: pdvs = [], isLoading: pdvsLoading } = useQuery<PointDeVente[]>({
    queryKey: ['points-de-vente'],
    queryFn: () => api.get('/points-de-vente?actif=true'),
    staleTime: 60_000,
  })

  const { data: clients = [] } = useQuery<ClientPOS[]>({
    queryKey: ['clients-pos'],
    queryFn: () => api.get('/clients?actif=true&limit=200'),
    staleTime: 120_000,
  })

  // Derive effective PDV id: auto-select when exactly 1 PDV
  const pointDeVenteId = !pdvsLoading && pdvs.length === 1 ? pdvs[0].id : selectedPdvId

  // Derive confirmed: no modal needed when 0 or 1 PDV, or user already picked one
  const pdvConfirmed = !pdvsLoading && (pdvs.length <= 1 || !!selectedPdvId)

  useEffect(() => {
    if (pointDeVenteId) localStorage.setItem(PDV_STORAGE_KEY, pointDeVenteId)
    else localStorage.removeItem(PDV_STORAGE_KEY)
  }, [pointDeVenteId])

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
        image: (p.image as string | null) ?? null,
        horsJour: Boolean(p.horsJour),
        variantes: ((p.variantes as Record<string, unknown>[]) ?? [])
          .filter((v) => v.actif)
          .map((v) => ({
            id: v.id as string,
            poids: v.poids != null ? Number(v.poids) : null,
            emballage: v.emballage as string,
            prixHT: Number(v.prixHT),
            tauxTVA: Number((v.tauxTVA as { taux?: number } | null)?.taux ?? 0),
            prixTTC: Number(v.prixTTC),
            sku: (v.sku as string | null) ?? null,
            venteAuPoids: Boolean(v.venteAuPoids),
            stockActuel: Number(v.stockActuel ?? 0),
            stockMin: v.stockMin != null ? Number(v.stockMin) : null,
            paliers: (
              (v.paliers as Array<{ id: string; qteMin: unknown; remisePct: unknown }>) ?? []
            ).map((p) => ({
              id: p.id,
              qteMin: Number(p.qteMin),
              remisePct: Number(p.remisePct),
            })),
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

  if (l1 || l2 || l3 || pdvsLoading || !user) {
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

  const showPdvModal = pdvs.length > 1 && !pdvConfirmed

  return (
    <>
      {showPdvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border-border w-full max-w-sm rounded-xl border shadow-2xl">
            <div className="px-6 py-5">
              <h2 className="text-foreground text-lg font-semibold">Choisir un point de vente</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Sélectionnez le point de vente pour cette session.
              </p>
              <div className="mt-4 space-y-2">
                {pdvs.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPdvId(p.id)}
                    className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                      pointDeVenteId === p.id
                        ? 'border-[#4A8A7A] bg-[#EAF3F0] text-[#2D4A3E]'
                        : 'border-border hover:bg-muted text-foreground'
                    }`}
                  >
                    {p.nom}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      <POSInterface
        produits={produits}
        user={{ id: user.id, prenom: user.prenom, nom: user.nom, role: user.role }}
        config={config}
        isCloturee={clotureStatut?.isCloturee ?? false}
        onReouverture={() => refetchStatut()}
        pointDeVenteId={pointDeVenteId || undefined}
        clients={clients}
      />
    </>
  )
}
