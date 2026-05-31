import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

type Categorie = { id: string; nom: string }

export default function CategoriesPage() {
  const qc = useQueryClient()
  const [newNom, setNewNom] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editNom, setEditNom] = useState('')

  const { data: categories = [], isLoading } = useQuery<Categorie[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  })

  const create = useMutation({
    mutationFn: (nom: string) => api.post<Categorie>('/categories', { nom }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setNewNom('')
      toast.success('Catégorie créée')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const update = useMutation({
    mutationFn: ({ id, nom }: { id: string; nom: string }) =>
      api.put<Categorie>(`/categories/${id}`, { nom }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setEditId(null)
      toast.success('Catégorie mise à jour')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Catégorie supprimée')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function startEdit(cat: Categorie) {
    setEditId(cat.id)
    setEditNom(cat.nom)
  }

  function cancelEdit() {
    setEditId(null)
    setEditNom('')
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const nom = newNom.trim()
    if (!nom) return
    create.mutate(nom)
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    const nom = editNom.trim()
    if (!nom || !editId) return
    update.mutate({ id: editId, nom })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Catégories</h1>
        <p className="text-sm text-zinc-500">Gérez les catégories de produits.</p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-6 py-4">
          <form onSubmit={handleCreate} className="flex gap-2">
            <Input
              value={newNom}
              onChange={(e) => setNewNom(e.target.value)}
              placeholder="Nouvelle catégorie…"
              className="max-w-xs"
            />
            <Button type="submit" disabled={!newNom.trim() || create.isPending} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </form>
        </div>

        {isLoading ? (
          <div className="h-32 animate-pulse rounded-b-lg bg-zinc-50" />
        ) : categories.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-400">Aucune catégorie</div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {categories.map((cat) => (
              <li key={cat.id} className="flex items-center gap-3 px-6 py-3">
                {editId === cat.id ? (
                  <form onSubmit={handleUpdate} className="flex flex-1 items-center gap-2">
                    <Input
                      value={editNom}
                      onChange={(e) => setEditNom(e.target.value)}
                      className="max-w-xs"
                      autoFocus
                    />
                    <Button
                      type="submit"
                      size="icon"
                      variant="ghost"
                      disabled={!editNom.trim() || update.isPending}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={cancelEdit}
                      className="text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </form>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-zinc-800">{cat.nom}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(cat)}
                      className="text-zinc-400 hover:text-zinc-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => remove.mutate(cat.id)}
                      disabled={remove.isPending}
                      className="text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
