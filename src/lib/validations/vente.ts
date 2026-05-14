import { z } from 'zod'

export const MODE_REGLEMENT = ['ESPECES', 'CB', 'CHEQUE', 'VIREMENT', 'TICKET_RESTO'] as const

export const ligneVenteSchema = z.object({
  varianteProduitId: z.string().min(1),
  qte: z.number().positive(),
  remise: z.number().min(0).max(100).default(0),
})

export const paiementVenteSchema = z.object({
  mode: z.enum(MODE_REGLEMENT),
  montant: z.number().positive(),
  reference: z.string().optional(),
})

export const venteCreateSchema = z.object({
  lignes: z.array(ligneVenteSchema).min(1, 'Au moins une ligne requise'),
  paiements: z.array(paiementVenteSchema).min(1, 'Au moins un paiement requis'),
})

export const annulationSchema = z.object({
  motif: z.string().min(1, 'Motif requis').max(500),
})
