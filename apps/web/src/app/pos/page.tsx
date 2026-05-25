import { connection } from 'next/server'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPosProducts, getPosConfig } from '@/lib/cached-data'
import { POSInterface } from '@/components/pos/pos-interface'
import type { ProduitPOS } from '@/types/pos'
import type { ConfigTicket } from '@/types/ticket'

export const metadata = { title: 'Caisse — Sous le Pommier' }

export default async function PosPage() {
  await connection()
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { id?: string; prenom?: string; nom?: string }

  const [produits, configRaw] = await Promise.all([getPosProducts(), getPosConfig()])

  const produitsSerialises: ProduitPOS[] = produits
    .filter((p) => p.variantes.length > 0)
    .map((p) => ({
      id: p.id,
      nom: p.nom,
      description: p.description,
      categorieNom: p.categorie?.nom ?? null,
      variantes: p.variantes.map((v) => ({
        id: v.id,
        poids: v.poids ? Number(v.poids) : null,
        emballage: v.emballage,
        prixHT: Number(v.prixHT),
        tauxTVA: Number(v.tauxTVA),
        prixTTC: Number(v.prixTTC),
      })),
    }))

  const config: ConfigTicket = configRaw
    ? {
        raisonSociale: configRaw.raisonSociale,
        siret: configRaw.siret,
        tvaIntracommunautaire: configRaw.tvaIntracommunautaire,
        adresse: configRaw.adresse,
        codePostal: configRaw.codePostal,
        ville: configRaw.ville,
        telephone: configRaw.telephone,
      }
    : null

  return (
    <POSInterface
      produits={produitsSerialises}
      user={{ id: user.id ?? '', prenom: user.prenom ?? '', nom: user.nom ?? '' }}
      config={config}
    />
  )
}
