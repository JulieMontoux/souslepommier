import { cacheLife, cacheTag } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function getPosProducts() {
  'use cache'
  cacheLife('hours')
  cacheTag('produits')

  return prisma.produit.findMany({
    where: { actif: true },
    include: {
      categorie: true,
      variantes: { where: { actif: true }, orderBy: { poids: 'asc' } },
    },
    orderBy: { nom: 'asc' },
  })
}

export async function getPosConfig() {
  'use cache'
  cacheLife('days')
  cacheTag('config')

  return prisma.configEntreprise.findFirst()
}

export async function getCategories() {
  'use cache'
  cacheLife('hours')
  cacheTag('categories')

  return prisma.categorie.findMany({ orderBy: { nom: 'asc' } })
}

export async function getDashboardProduits() {
  'use cache'
  cacheLife('hours')
  cacheTag('produits')

  return prisma.produit.findMany({
    include: { categorie: true, variantes: { orderBy: { poids: 'asc' } } },
    orderBy: { nom: 'asc' },
  })
}
