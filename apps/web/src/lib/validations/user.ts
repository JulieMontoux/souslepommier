import { z } from 'zod'

export const userCreateSchema = z.object({
  email: z.string().email(),
  prenom: z.string().min(1).max(50),
  nom: z.string().min(1).max(50),
  role: z.enum(['VENDEUR', 'GERANT']).default('VENDEUR'),
})

export const userUpdateSchema = z.object({
  prenom: z.string().min(1).max(50).optional(),
  nom: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  role: z.enum(['VENDEUR', 'GERANT']).optional(),
})

export const userStatutSchema = z.object({
  actif: z.boolean(),
})
