'use client'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { toast } from 'sonner'
import { LogOut, Package, UserRound, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { recapTVA, roundFiscal, calcMontantTVA } from '@/lib/tva'
import { enqueueVente, syncOfflineVentes } from '@/lib/offline-queue'
import { useNetwork } from '@/hooks/use-network'
import { VariantePicker } from './variante-picker'
import { WeightInputModal } from './weight-input-modal'
import { PaiementModal } from './paiement-modal'
import { TicketModal } from './ticket-modal'
import { ProductList } from './ProductList'
import { CartPanel } from './CartPanel'
import type { PaiementInput } from './paiement-modal'
import type { ProduitPOS, ProduitPOSVariante, LigneCart } from '@/types/pos'
import type { ConfigTicket } from '@/types/ticket'

const EMBALLAGE_LABELS: Record<string, string> = {
  VRAC: 'Vrac',
  BARQUETTE: 'Barquette',
  FILET: 'Filet',
  SAC: 'Sac',
  CAISSE: 'Caisse',
  PLATEAU: 'Plateau',
}

function buildVarianteLabel(v: ProduitPOSVariante): string {
  const parts: string[] = []
  if (!v.venteAuPoids && v.poids) parts.push(`${v.poids} kg`)
  parts.push(EMBALLAGE_LABELS[v.emballage] ?? v.emballage)
  parts.push(
    v.venteAuPoids
      ? `${v.prixTTC.toFixed(2).replace('.', ',')} €/kg`
      : `${v.prixTTC.toFixed(2).replace('.', ',')} €`
  )
  return parts.join(' · ')
}

type ClientPOS = { id: string; raisonSociale: string }

interface POSInterfaceProps {
  produits: ProduitPOS[]
  user: { id: string; prenom: string; nom: string; role: string }
  config: ConfigTicket
  isCloturee: boolean
  onReouverture: () => void
  pointDeVenteId?: string
  clients?: ClientPOS[]
}

export function POSInterface({
  produits,
  user,
  config,
  isCloturee,
  onReouverture,
  pointDeVenteId,
  clients = [],
}: POSInterfaceProps) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const queryClient = useQueryClient()
  const online = useNetwork()
  const [reopening, setReopening] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  async function handleReouverture() {
    setReopening(true)
    try {
      const res = await fetch('/api/clotures/today', { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Impossible de rouvrir la caisse')
        return
      }
      toast.success('Caisse rouverte')
      onReouverture()
    } finally {
      setReopening(false)
    }
  }

  const [clientId, setClientId] = useState<string | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [clientOpen, setClientOpen] = useState(false)

  useEffect(() => {
    if (!clientOpen) return
    function close(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-client-picker]')) setClientOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [clientOpen])

  const selectedClient = clients.find((c) => c.id === clientId) ?? null
  const filteredClients = clientSearch.trim()
    ? clients.filter((c) => c.raisonSociale.toLowerCase().includes(clientSearch.toLowerCase()))
    : clients

  const [cart, setCart] = useState<LigneCart[]>(() => {
    try {
      const saved = localStorage.getItem('pos-cart')
      return saved ? (JSON.parse(saved) as LigneCart[]) : []
    } catch {
      return []
    }
  })
  const [picking, setPicking] = useState<ProduitPOS | null>(null)
  const [weighing, setWeighing] = useState<{
    produit: ProduitPOS
    variante: ProduitPOSVariante
  } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastVente, setLastVente] = useState<{ id: string; numeroTicket: string } | null>(null)
  const [showTicket, setShowTicket] = useState(false)

  useEffect(() => {
    localStorage.setItem('pos-cart', JSON.stringify(cart))
  }, [cart])

  // Auto-sync offline queue when network returns
  useEffect(() => {
    if (!online) return
    syncOfflineVentes()
      .then(({ synced }) => {
        if (synced > 0) {
          toast.success(
            `${synced} vente${synced > 1 ? 's' : ''} hors ligne synchronisée${synced > 1 ? 's' : ''}`
          )
          void queryClient.invalidateQueries({ queryKey: ['produits', 'pos'] })
        }
      })
      .catch(() => {})
  }, [online])

  function addToCart(produit: ProduitPOS) {
    if (produit.variantes.length === 0) {
      toast.error('Aucune variante disponible')
      return
    }
    if (produit.variantes.length === 1) {
      addVariante(produit, produit.variantes[0])
    } else {
      setPicking(produit)
    }
  }

  function addVariante(produit: ProduitPOS, variante: ProduitPOSVariante, poidsKg?: number) {
    setPicking(null)
    setWeighing(null)

    if (variante.venteAuPoids && poidsKg === undefined) {
      setWeighing({ produit, variante })
      return
    }

    const qte = variante.venteAuPoids ? (poidsKg ?? 0) : 1
    const lineKey = variante.venteAuPoids ? `${variante.id}-${Date.now()}` : variante.id

    setCart((prev) => {
      if (!variante.venteAuPoids) {
        const existing = prev.find((l) => l.varianteProduitId === variante.id && !l.venteAuPoids)
        if (existing) {
          const newQte = roundFiscal(existing.qte + 1)
          const palierRemise = getBestRemise(variante.id, newQte)
          return prev.map((l) =>
            l.key === existing.key
              ? { ...l, qte: newQte, remise: palierRemise > 0 ? palierRemise : (l.remise ?? 0) }
              : l
          )
        }
      }
      const palierRemise = getBestRemise(variante.id, qte)
      return [
        ...prev,
        {
          key: lineKey,
          varianteProduitId: variante.id,
          produitNom: produit.nom,
          varianteLabel: buildVarianteLabel(variante),
          qte,
          prixUnitaireHT: variante.prixHT,
          tauxTVA: variante.tauxTVA,
          venteAuPoids: variante.venteAuPoids,
          ...(palierRemise > 0 && { remise: palierRemise }),
        },
      ]
    })
  }

  function getBestRemise(varianteProduitId: string, qte: number): number {
    const variante = produits.flatMap((p) => p.variantes).find((v) => v.id === varianteProduitId)
    if (!variante || variante.paliers.length === 0) return 0
    const sorted = [...variante.paliers].sort((a, b) => b.qteMin - a.qteMin)
    const best = sorted.find((p) => qte >= p.qteMin)
    return best ? best.remisePct : 0
  }

  function updateQte(key: string, qte: number) {
    if (isNaN(qte) || qte <= 0) {
      setCart((prev) => prev.filter((l) => l.key !== key))
    } else {
      setCart((prev) =>
        prev.map((l) => {
          if (l.key !== key) return l
          const safeQte = l.venteAuPoids ? qte : Math.round(qte)
          const palierRemise = getBestRemise(l.varianteProduitId, safeQte)
          return { ...l, qte: safeQte, remise: palierRemise > 0 ? palierRemise : (l.remise ?? 0) }
        })
      )
    }
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key))
  }

  function updateRemise(key: string, remise: number) {
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, remise } : l)))
  }

  // Computed totals
  const lignesComputed = cart.map((l) => {
    const remise = l.remise ?? 0
    const montantHT = roundFiscal(l.prixUnitaireHT * l.qte * (1 - remise / 100))
    const montantTVA = calcMontantTVA(montantHT, l.tauxTVA)
    return { ...l, montantHT, montantTVA, montantTTC: roundFiscal(montantHT + montantTVA) }
  })
  const totalHT = roundFiscal(lignesComputed.reduce((s, l) => s + l.montantHT, 0))
  const totalTTC = roundFiscal(lignesComputed.reduce((s, l) => s + l.montantTTC, 0))
  const tvaRecap = recapTVA(
    lignesComputed.map((l) => ({ tauxTVA: l.tauxTVA, montantHT: l.montantHT }))
  )

  // Keyboard shortcuts + barcode scanner (douchette USB/BT sends rapid keystrokes ending with Enter)
  useEffect(() => {
    let scanBuffer = ''
    let lastKeyTime = 0

    function onKey(e: KeyboardEvent) {
      const now = Date.now()
      const isInput = (e.target as HTMLElement).tagName === 'INPUT'

      // Barcode scanner detection: rapid keystrokes (< 50ms apart) not in an input
      if (!isInput && e.key.length === 1) {
        if (now - lastKeyTime < 50) {
          scanBuffer += e.key
        } else {
          scanBuffer = e.key
        }
        lastKeyTime = now
        return
      }

      if (!isInput && e.key === 'Enter' && scanBuffer.length >= 2 && now - lastKeyTime < 200) {
        const sku = scanBuffer.trim()
        scanBuffer = ''
        lastKeyTime = 0
        // Find variante by SKU
        let found: { produit: ProduitPOS; variante: ProduitPOSVariante } | null = null
        for (const p of produits) {
          for (const v of p.variantes) {
            if (v.sku && v.sku === sku) {
              found = { produit: p, variante: v }
              break
            }
          }
          if (found) break
        }
        if (found) {
          addVariante(found.produit, found.variante)
          toast.success(`${found.produit.nom} ajouté (SKU: ${sku})`)
        } else {
          toast.error(`SKU inconnu : ${sku}`)
        }
        return
      }

      // Reset scan buffer on slow keypresses or special keys
      if (e.key.length === 1 && isInput) {
        scanBuffer = ''
        lastKeyTime = 0
      }

      if (!isInput) {
        scanBuffer = ''
        lastKeyTime = 0
      }

      if (isInput) return

      if (e.key === 'Escape') {
        if (picking) setPicking(null)
        else if (weighing) setWeighing(null)
        else if (confirming) setConfirming(false)
      }
      if (e.key === 'Enter' && !picking && !weighing && !confirming && cart.length > 0) {
        setConfirming(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picking, weighing, confirming, cart.length, produits])

  async function handleEncaisser(paiements: PaiementInput[]) {
    if (cart.length === 0 || saving) return
    setSaving(true)

    const payload = {
      lignes: cart.map((l) => ({
        varianteProduitId: l.varianteProduitId,
        qte: l.qte,
        ...(l.remise && l.remise > 0 ? { remise: l.remise } : {}),
      })),
      paiements,
      ...(pointDeVenteId && { pointDeVenteId }),
      ...(clientId && { clientId }),
    }

    if (!online) {
      // Store locally, sync when network returns
      await enqueueVente(payload)
      toast.success('Vente enregistrée hors ligne — sera synchronisée dès le retour du réseau')
      setCart([])
      setConfirming(false)
      setSaving(false)
      return
    }

    try {
      const res = await fetch('/api/ventes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { error?: string }).error ?? 'Erreur lors de la vente')
        return
      }
      const vente = await res.json()
      setLastVente({ id: vente.id, numeroTicket: vente.numeroTicket })
      setCart([])
      setClientId(null)
      setClientSearch('')
      setConfirming(false)
      void queryClient.invalidateQueries({ queryKey: ['produits', 'pos'] })
    } catch {
      // Network error mid-request — queue offline
      await enqueueVente(payload)
      toast.warning('Vente sauvegardée hors ligne')
      setCart([])
      setConfirming(false)
    } finally {
      setSaving(false)
    }
  }

  if (isCloturee) {
    return (
      <div className="bg-background flex h-screen flex-col">
        <header className="border-sidebar-border bg-sidebar flex h-14 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="h-7 w-7 rounded-md object-contain" />
            <span className="text-sidebar-foreground font-semibold">Caisse</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sidebar-foreground/70 text-sm">
              {user.prenom} {user.nom}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              Quitter
            </Button>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
            <LogOut className="h-8 w-8 text-amber-600" />
          </div>
          <div className="text-center">
            <p className="text-foreground text-lg font-semibold">Caisse clôturée</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {user.role === 'GERANT'
                ? 'La journée a été clôturée. Vous pouvez rouvrir la caisse.'
                : 'La journée a été clôturée. Contactez le gérant.'}
            </p>
          </div>
          {user.role === 'GERANT' && (
            <Button onClick={handleReouverture} disabled={reopening} className="mt-2 gap-2">
              <LogOut className="h-4 w-4 rotate-180" />
              {reopening ? 'Réouverture…' : 'Rouvrir la caisse'}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background flex h-screen flex-col">
      {/* Header */}
      <header className="border-sidebar-border bg-sidebar flex h-14 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-7 w-7 rounded-md object-contain" />
          <span className="text-sidebar-foreground font-semibold">Caisse</span>
          {!online && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
              Hors ligne
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/produits"
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors"
          >
            <Package className="h-4 w-4" />
            Produits
          </Link>

          {/* Client selector */}
          {clients.length > 0 && (
            <div className="relative" data-client-picker>
              {selectedClient ? (
                <div className="flex items-center gap-1.5 rounded-md bg-green-600/20 px-2 py-1 text-xs text-green-400">
                  <UserRound className="h-3.5 w-3.5" />
                  <span className="max-w-[120px] truncate">{selectedClient.raisonSociale}</span>
                  <button
                    onClick={() => {
                      setClientId(null)
                      setClientSearch('')
                    }}
                    className="hover:text-green-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setClientOpen((o) => !o)}
                  className="text-sidebar-foreground/60 hover:text-sidebar-foreground flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors"
                >
                  <UserRound className="h-4 w-4" />
                  Client
                </button>
              )}
              {clientOpen && !selectedClient && (
                <div className="bg-card border-border absolute top-full right-0 z-50 mt-1 w-64 rounded-lg border shadow-lg">
                  <div className="p-2">
                    <input
                      autoFocus
                      type="text"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Rechercher un client…"
                      className="border-border bg-background text-foreground w-full rounded-md border px-2 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredClients.length === 0 ? (
                      <p className="text-muted-foreground px-3 py-2 text-xs">Aucun résultat</p>
                    ) : (
                      filteredClients.slice(0, 30).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setClientId(c.id)
                            setClientOpen(false)
                            setClientSearch('')
                          }}
                          className="hover:bg-muted w-full truncate px-3 py-2 text-left text-sm"
                        >
                          {c.raisonSociale}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <span className="text-sidebar-foreground/70 text-sm">
            {user.prenom} {user.nom}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            Quitter
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Catalogue */}
        <ProductList produits={produits} onProductSelect={addToCart} />

        {/* Panier */}
        <CartPanel
          cart={cart}
          onUpdateQte={updateQte}
          onUpdateRemise={updateRemise}
          onRemoveLine={removeLine}
          onClearCart={() => setCart([])}
          onConfirmPayment={handleEncaisser}
          setConfirming={setConfirming}
          setSaving={setSaving}
          totalHT={totalHT}
          totalTTC={totalTTC}
          tvaRecap={tvaRecap}
          config={config}
          lastVente={lastVente}
          onPrintTicket={() => setShowTicket(true)}
          onNouvelleVente={() => {
            setLastVente(null)
            setShowTicket(false)
          }}
        />
      </div>

      {/* Variante picker */}
      {picking && (
        <VariantePicker
          produit={picking}
          onSelect={(variante) => addVariante(picking, variante)}
          onClose={() => setPicking(null)}
        />
      )}

      {/* Saisie poids */}
      {weighing && (
        <WeightInputModal
          produit={weighing.produit}
          variante={weighing.variante}
          onConfirm={(poids) => addVariante(weighing.produit, weighing.variante, poids)}
          onClose={() => setWeighing(null)}
        />
      )}

      {/* Ticket à la demande */}
      {showTicket && lastVente && (
        <TicketModal
          venteId={lastVente.id}
          venteNumero={lastVente.numeroTicket}
          config={config}
          onClose={() => setShowTicket(false)}
        />
      )}

      {/* Modal paiement multi-modes */}
      {confirming && (
        <PaiementModal
          totalTTC={totalTTC}
          onConfirm={handleEncaisser}
          onClose={() => setConfirming(false)}
          saving={saving}
        />
      )}
    </div>
  )
}
