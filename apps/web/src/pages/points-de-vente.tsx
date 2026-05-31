import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Plus, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type PDV = { id: string; nom: string; actif: boolean; createdAt: string }

function PDVDialog({ pdv, onClose }: { pdv?: PDV; onClose: () => void }) {
  const qc = useQueryClient()
  const [nom, setNom] = useState(pdv?.nom ?? '')

  const mutation = useMutation({
    mutationFn: (payload: { nom: string; actif?: boolean }) =>
      pdv ? api.put(`/points-de-vente/${pdv.id}`, payload) : api.post('/points-de-vente', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['points-de-vente'] })
      toast.success(pdv ? 'Point de vente mis à jour' : 'Point de vente créé')
      onClose()
    },
    onError: (e: Error) => toast.error(e.message ?? 'Erreur'),
  })

  const toggleActif = useMutation({
    mutationFn: () => api.put(`/points-de-vente/${pdv!.id}`, { nom: pdv!.nom, actif: !pdv!.actif }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['points-de-vente'] })
      toast.success(pdv!.actif ? 'Point de vente désactivé' : 'Point de vente activé')
      onClose()
    },
    onError: () => toast.error('Erreur'),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{pdv ? 'Modifier point de vente' : 'Nouveau point de vente'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Nom</Label>
            <Input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex : Ferme, Marché Saint-Marcellin…"
              autoFocus
            />
          </div>
          <div className="flex justify-between gap-2">
            {pdv && (
              <Button
                variant="outline"
                onClick={() => toggleActif.mutate()}
                disabled={toggleActif.isPending}
                className="text-sm"
              >
                {pdv.actif ? 'Désactiver' : 'Activer'}
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button
                onClick={() => {
                  if (!nom.trim()) {
                    toast.error('Nom requis')
                    return
                  }
                  mutation.mutate({ nom: nom.trim() })
                }}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function PointsDeVentePage() {
  const [dialog, setDialog] = useState<{ open: boolean; pdv?: PDV }>({ open: false })

  const { data: pdvs = [], isLoading } = useQuery<PDV[]>({
    queryKey: ['points-de-vente'],
    queryFn: () => api.get('/points-de-vente'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Points de vente</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Canaux de vente : ferme, marchés, en ligne…
          </p>
        </div>
        <Button className="shrink-0 gap-2" onClick={() => setDialog({ open: true })}>
          <Plus className="h-4 w-4" />
          Nouveau
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      ) : pdvs.length === 0 ? (
        <div className="border-border bg-card flex flex-col items-center justify-center rounded-xl border py-16">
          <MapPin className="text-muted-foreground/40 mb-3 h-8 w-8" />
          <p className="text-muted-foreground text-sm">Aucun point de vente défini</p>
          <Button
            variant="outline"
            className="mt-4 gap-2"
            onClick={() => setDialog({ open: true })}
          >
            <Plus className="h-4 w-4" />
            Créer
          </Button>
        </div>
      ) : (
        <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/40 border-b">
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">Nom</th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">Statut</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {pdvs.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <MapPin className="text-muted-foreground h-4 w-4 shrink-0" />
                      {p.nom}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={p.actif ? 'default' : 'secondary'}>
                      {p.actif ? 'Actif' : 'Inactif'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDialog({ open: true, pdv: p })}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialog.open && <PDVDialog pdv={dialog.pdv} onClose={() => setDialog({ open: false })} />}
    </div>
  )
}
