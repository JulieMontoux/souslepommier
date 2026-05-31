'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { TYPE_LABELS, type TypeDroitRGPD } from '@/types/rgpd'

const TYPES = Object.entries(TYPE_LABELS) as [TypeDroitRGPD, string][]

export function DemandeRGPDForm() {
  const [type, setType] = useState<TypeDroitRGPD>('ACCES')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [isPending, start] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      const res = await fetch('/api/rgpd/demandes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, nom, email, message: message || undefined }),
      })
      if (!res.ok) {
        toast.error("Erreur lors de l'envoi. Réessayez.")
        return
      }
      setSent(true)
    })
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="font-medium text-green-800">Demande enregistrée</p>
        <p className="mt-1 text-sm text-green-600">
          Nous traiterons votre demande dans un délai de 30 jours, conformément au RGPD.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">Type de demande</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TypeDroitRGPD)}
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
        >
          {TYPES.map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Nom complet</label>
          <input
            required
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          Précisions <span className="text-zinc-400">(facultatif)</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
        />
      </div>
      <Button type="submit" disabled={isPending}>
        Envoyer la demande
      </Button>
    </form>
  )
}
