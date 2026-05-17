import { z } from 'zod'

export const TYPE_EMBALLAGE = ['VRAC', 'BARQUETTE', 'FILET', 'SAC', 'CAISSE', 'PLATEAU'] as const

export const produitSchema = z.object({
  nom: z.string().min(1, 'Nom requis').max(100),
  categorieId: z.string().cuid().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  image: z.string().url().optional().nullable(),
  actif: z.boolean().default(true),
})

export const varianteSchema = z.object({
  poids: z.number().positive('Poids doit être positif').optional().nullable(),
  emballage: z.enum(TYPE_EMBALLAGE).default('VRAC'),
  prixHT: z.number().positive('Prix HT doit être positif'),
  tauxTVA: z.number().min(0).max(100),
  sku: z.string().max(50).optional().nullable(),
  actif: z.boolean().default(true),
})

export const categorieSchema = z.object({
  nom: z.string().min(1).max(100),
})

export type ProduitInput = z.infer<typeof produitSchema>
export type VarianteInput = z.infer<typeof varianteSchema>
