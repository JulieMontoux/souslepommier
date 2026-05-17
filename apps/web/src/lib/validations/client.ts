import { z } from 'zod'

function luhnSiret(siret: string): boolean {
  let sum = 0
  for (let i = 0; i < 14; i++) {
    let n = parseInt(siret[i])
    if (i % 2 === 0) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
  }
  return sum % 10 === 0
}

export const CONDITIONS_PAIEMENT = [0, 30, 45, 60] as const

export const clientCreateSchema = z.object({
  raisonSociale: z.string().min(1, 'Raison sociale requise').max(200),
  siret: z
    .string()
    .regex(/^\d{14}$/, 'SIRET : 14 chiffres requis')
    .refine(luhnSiret, 'SIRET invalide')
    .optional()
    .nullable(),
  tvaIntracommunautaire: z
    .string()
    .regex(/^FR\d{11}$/, 'Format attendu : FR + 11 chiffres')
    .optional()
    .nullable(),
  adresse: z.string().max(200).optional().nullable(),
  codePostal: z
    .string()
    .regex(/^\d{5}$/, 'Code postal : 5 chiffres')
    .optional()
    .nullable(),
  ville: z.string().max(100).optional().nullable(),
  pays: z.string().length(2).default('FR'),
  email: z.string().email('Email invalide').optional().nullable(),
  telephone: z.string().max(20).optional().nullable(),
  conditionsPaiement: z.number().int().min(0).max(120).default(30),
  notes: z.string().max(1000).optional().nullable(),
})

export const clientUpdateSchema = clientCreateSchema.extend({
  actif: z.boolean().optional(),
})

export type ClientCreateInput = z.infer<typeof clientCreateSchema>
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>
