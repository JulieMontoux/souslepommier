import type { TypeEmballage } from '@souslepommier/database'

function slugify(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function generateSKU(
  nomProduit: string,
  poids: number | null | undefined,
  emballage: TypeEmballage
): string {
  const nom = slugify(nomProduit).slice(0, 10)
  const poidsStr = poids != null ? `${poids}KG` : ''
  const parts = [nom, poidsStr, emballage].filter(Boolean)
  return parts.join('-')
}
