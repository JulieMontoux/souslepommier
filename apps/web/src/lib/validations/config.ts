import { z } from 'zod'

// SIRET : 14 chiffres exactement
const siretSchema = z
  .string()
  .regex(/^\d{14}$/, 'SIRET invalide — 14 chiffres requis')
  .optional()
  .or(z.literal(''))

// TVA intracommunautaire FR : FR + 2 alphanum + 9 chiffres
const tvaIntraSchema = z
  .string()
  .regex(/^FR[A-Z0-9]{2}\d{9}$/, 'Format invalide — ex: FR12345678901')
  .optional()
  .or(z.literal(''))

// IBAN simplifié (16-34 caractères alphanum)
const ibanSchema = z
  .string()
  .regex(/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/, 'IBAN invalide')
  .optional()
  .or(z.literal(''))

// Code APE/NAF : 4 chiffres + 1 lettre
const apeSchema = z
  .string()
  .regex(/^\d{4}[A-Z]$/, 'Code APE invalide — ex: 4711D')
  .optional()
  .or(z.literal(''))

export const configSchema = z.object({
  raisonSociale: z.string().min(1, 'Raison sociale requise').max(200),
  formeJuridique: z.string().optional(),
  capitalSocial: z.number().positive('Doit être positif').optional(),
  siret: siretSchema,
  tvaIntracommunautaire: tvaIntraSchema,
  adresse: z.string().max(500).optional(),
  codePostal: z
    .string()
    .regex(/^\d{5}$/, 'Code postal invalide')
    .optional()
    .or(z.literal('')),
  ville: z.string().max(100).optional(),
  pays: z.string().length(2).default('FR'),
  telephone: z
    .string()
    .regex(/^(\+33|0)[1-9](\d{2}){4}$/, 'Téléphone invalide')
    .optional()
    .or(z.literal('')),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  iban: ibanSchema,
  rcs: z.string().max(50).optional(),
  villeRCS: z.string().max(100).optional(),
  codeAPE: apeSchema,
  regimeTVA: z.enum(['NORMAL', 'SIMPLIFIE', 'FRANCHISE']).default('NORMAL'),
  responsableRGPD: z.string().max(200).optional(),
  emailRGPD: z.string().email('Email RGPD invalide').optional().or(z.literal('')),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional().or(z.literal('')),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpFrom: z.string().optional(),
  smtpTls: z.boolean().default(true),
})

export type ConfigFormValues = z.infer<typeof configSchema>

export const FORMES_JURIDIQUES = [
  'EI',
  'EIRL',
  'EURL',
  'SARL',
  'SA',
  'SAS',
  'SASU',
  'SNC',
  'SCI',
  'Association',
  'Autre',
] as const
