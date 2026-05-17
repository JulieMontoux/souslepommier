import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ArrowLeft, Pencil, Building2, Mail, Phone, FileText } from 'lucide-react'

export const metadata = { title: 'Fiche client — Sous le Pommier' }

const CONDITIONS_LABELS: Record<number, string> = {
  0: 'Comptant',
  30: '30 jours',
  45: '45 jours',
  60: '60 jours',
}

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  EMISE: 'Émise',
  PAYEE: 'Payée',
  ANNULEE: 'Annulée',
}

const STATUT_COLORS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  BROUILLON: 'secondary',
  EMISE: 'default',
  PAYEE: 'default',
  ANNULEE: 'destructive',
}

export default async function ClientFichePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      factures: {
        orderBy: { dateEmission: 'desc' },
        take: 20,
      },
    },
  })

  if (!client) notFound()

  const conditions =
    CONDITIONS_LABELS[client.conditionsPaiement] ?? `${client.conditionsPaiement} jours`

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/clients"
            className={buttonVariants({ variant: 'ghost', size: 'icon' })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">{client.raisonSociale}</h1>
            {client.siret && (
              <p className="font-mono text-sm text-zinc-500">SIRET : {client.siret}</p>
            )}
          </div>
        </div>
        <Link
          href={`/dashboard/clients/${id}/modifier`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <Pencil className="h-3.5 w-3.5" />
          Modifier
        </Link>
      </div>

      {/* Fiche */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            <Building2 className="h-3.5 w-3.5" />
            Coordonnées
          </p>
          <dl className="space-y-2 text-sm">
            {client.adresse && (
              <div>
                <dt className="text-xs text-zinc-400">Adresse</dt>
                <dd className="text-zinc-700">{client.adresse}</dd>
              </div>
            )}
            {(client.codePostal || client.ville) && (
              <div>
                <dt className="text-xs text-zinc-400">Commune</dt>
                <dd className="text-zinc-700">
                  {[client.codePostal, client.ville].filter(Boolean).join(' ')}
                </dd>
              </div>
            )}
            {client.email && (
              <div>
                <dt className="flex items-center gap-1 text-xs text-zinc-400">
                  <Mail className="h-3 w-3" /> Email
                </dt>
                <dd className="text-zinc-700">{client.email}</dd>
              </div>
            )}
            {client.telephone && (
              <div>
                <dt className="flex items-center gap-1 text-xs text-zinc-400">
                  <Phone className="h-3 w-3" /> Téléphone
                </dt>
                <dd className="text-zinc-700">{client.telephone}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Informations fiscales
          </p>
          <dl className="space-y-2 text-sm">
            {client.tvaIntracommunautaire && (
              <div>
                <dt className="text-xs text-zinc-400">N° TVA</dt>
                <dd className="font-mono text-zinc-700">{client.tvaIntracommunautaire}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-zinc-400">Conditions de paiement</dt>
              <dd className="text-zinc-700">{conditions}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Statut</dt>
              <dd>
                <Badge variant={client.actif ? 'default' : 'secondary'}>
                  {client.actif ? 'Actif' : 'Inactif'}
                </Badge>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {client.notes && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Notes internes
          </p>
          <p className="text-sm whitespace-pre-wrap text-zinc-700">{client.notes}</p>
        </div>
      )}

      {/* Historique factures */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-4">
          <FileText className="h-4 w-4 text-zinc-500" />
          <p className="font-semibold text-zinc-900">Factures</p>
          <span className="ml-auto text-sm text-zinc-400">
            {client.factures.length} facture{client.factures.length > 1 ? 's' : ''}
          </span>
        </div>
        {client.factures.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-400">Aucune facture pour ce client</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                <th className="px-5 py-3 text-left">Numéro</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-right">TTC</th>
                <th className="px-5 py-3 text-left">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {client.factures.map((f) => (
                <tr key={f.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3 font-mono text-zinc-700">{f.numero}</td>
                  <td className="px-5 py-3 text-zinc-600">
                    {f.dateEmission.toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-zinc-900">
                    {Number(f.totalTTC).toFixed(2).replace('.', ',')} €
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={STATUT_COLORS[f.statut] ?? 'secondary'}>
                      {STATUT_LABELS[f.statut] ?? f.statut}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
