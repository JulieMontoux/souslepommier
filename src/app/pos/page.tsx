import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { POSInterface } from '@/components/pos/pos-interface'
import type { ProduitPOS } from '@/types/pos'

export const metadata = { title: 'Caisse — Sous le Pommier' }

export default async function PosPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { id?: string; prenom?: string; nom?: string }

  const produits = await prisma.produit.findMany({
    where: { actif: true },
    include: {
      categorie: true,
      variantes: {
        where: { actif: true },
        orderBy: { poids: 'asc' },
      },
    },
    orderBy: { nom: 'asc' },
  })

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

  return (
    <POSInterface
      produits={produitsSerialises}
      user={{
        id: user.id ?? '',
        prenom: user.prenom ?? '',
        nom: user.nom ?? '',
      }}
    />
  )
}
