import { z } from 'zod'

export const ligneFactureInputSchema = z.object({
  designation: z.string().min(1, 'Désignation requise').max(200),
  qte: z.number().positive('Quantité > 0'),
  prixUnitaireHT: z.number().min(0, 'Prix ≥ 0'),
  tauxTVA: z.number().min(0).max(100),
  remise: z.number().min(0).max(100).default(0),
})

export const factureCreateSchema = z.object({
  clientId: z.string().min(1, 'Client requis'),
  venteId: z.string().optional().nullable(),
  lignes: z.array(ligneFactureInputSchema).optional(),
  dateEcheance: z.string().datetime().optional().nullable(),
  dateLivraison: z.string().datetime().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  statut: z.enum(['BROUILLON', 'EMISE']).default('BROUILLON'),
})

export const facturePaiementSchema = z.object({
  statut: z.literal('PAYEE'),
  datePaiement: z.string().datetime({ message: 'Date de paiement requise' }),
})

export const factureEmissionSchema = z.object({
  statut: z.literal('EMISE'),
})

export const factureStatutSchema = z.discriminatedUnion('statut', [
  facturePaiementSchema,
  factureEmissionSchema,
])

export const factureAnnulationSchema = z.object({
  motif: z.string().max(500).optional().nullable(),
})

export type LigneFactureInput = z.infer<typeof ligneFactureInputSchema>
export type FactureCreateInput = z.infer<typeof factureCreateSchema>
