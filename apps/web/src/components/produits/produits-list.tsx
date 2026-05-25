'use client'

import { useState, useTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import type { ProduitComplet } from '@/types/produits'
import type { Categorie } from '@souslepommier/database'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { DeactivateDialog } from './deactivate-dialog'
import { cn } from '@/lib/utils'
import { Plus, Pencil, Search } from 'lucide-react'

interface ProduitsListProps {
  produits: ProduitComplet[]
  categories: Categorie[]
}

export function ProduitsList({ produits: initial, categories }: ProduitsListProps) {
  const navigate = useNavigate()
  const [isPending, startTransition] = useTransition()
  const [produits, setProduits] = useState(initial)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<'tous' | 'actif' | 'inactif'>('tous')
  const [filterCategorie, setFilterCategorie] = useState<string>('tous')
  const [confirmDialog, setConfirmDialog] = useState<{ id: string; nom: string } | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const filtered = produits.filter((p) => {
    if (filterStatut === 'actif' && !p.actif) return false
    if (filterStatut === 'inactif' && p.actif) return false
    if (filterCategorie !== 'tous' && p.categorieId !== filterCategorie) return false
    if (search && !p.nom.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  async function toggleStatut(produit: ProduitComplet, actif: boolean) {
    if (!actif) {
      setConfirmDialog({ id: produit.id, nom: produit.nom })
      return
    }
    await doToggle(produit.id, actif)
  }

  async function doToggle(id: string, actif: boolean) {
    setToggling(id)
    setConfirmDialog(null)
    try {
      const res = await fetch(`/api/produits/${id}/statut`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif }),
      })
      if (!res.ok) {
        toast.error('Erreur lors de la mise à jour')
        return
      }
      setProduits((prev) => prev.map((p) => (p.id === id ? { ...p, actif } : p)))
      toast.success(actif ? 'Produit activé' : 'Produit désactivé')
      startTransition(() => window.location.reload())
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Catalogue produits</h1>
          <p className="text-sm text-zinc-500">
            {produits.length} produit{produits.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/dashboard/produits/nouveau" className={cn(buttonVariants(), 'gap-2')}>
          <Plus className="h-4 w-4" />
          Nouveau produit
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filterStatut}
          onValueChange={(v) => setFilterStatut(v as typeof filterStatut)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous</SelectItem>
            <SelectItem value="actif">Actifs</SelectItem>
            <SelectItem value="inactif">Inactifs</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategorie} onValueChange={(v) => setFilterCategorie(v ?? 'tous')}>
          <SelectTrigger className="w-44">
            <span className="flex-1 text-left text-sm">
              {filterCategorie === 'tous'
                ? 'Toutes catégories'
                : (categories.find((c) => c.id === filterCategorie)?.nom ?? 'Catégorie')}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Toutes catégories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tableau */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead className="w-[280px]">Produit</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead className="text-center">Variantes</TableHead>
              <TableHead>Prix (à partir de)</TableHead>
              <TableHead className="text-center">Actif</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-zinc-400">
                  Aucun produit trouvé
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((produit) => {
                const variantesActives = produit.variantes.filter((v) => v.actif)
                const prixMin = variantesActives.length
                  ? Math.min(...variantesActives.map((v) => v.prixTTC))
                  : null
                return (
                  <TableRow key={produit.id} className="hover:bg-zinc-50/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-green-50 text-lg">
                          🍎
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">{produit.nom}</p>
                          {produit.description && (
                            <p className="line-clamp-1 text-xs text-zinc-400">
                              {produit.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {produit.categorie ? (
                        <Badge variant="secondary">{produit.categorie.nom}</Badge>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-zinc-100 px-2 text-xs font-medium text-zinc-700">
                        {produit.variantes.length}
                      </span>
                    </TableCell>
                    <TableCell>
                      {prixMin != null ? (
                        <span className="font-medium text-zinc-900">
                          {prixMin.toFixed(2).replace('.', ',')} €
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={produit.actif}
                        disabled={toggling === produit.id || isPending}
                        onCheckedChange={(checked) => toggleStatut(produit, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to={`/dashboard/produits/${produit.id}`}
                        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1.5')}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Modifier
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation désactivation */}
      <DeactivateDialog
        open={!!confirmDialog}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
        label={`"${confirmDialog?.nom}"`}
        onConfirm={() => confirmDialog && doToggle(confirmDialog.id, false)}
        loading={toggling === confirmDialog?.id}
      />
    </div>
  )
}
