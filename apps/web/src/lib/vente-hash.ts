import { createHmac } from 'crypto'

interface VenteHashData {
  numero: string
  date: string
  totalTTC: string
  vendeurId: string
  hashPrecedent: string
}

export function computeVenteHash(data: VenteHashData): string {
  const secret = process.env.SIGNING_SECRET
  if (!secret) throw new Error('SIGNING_SECRET manquant')
  return createHmac('sha256', secret).update(JSON.stringify(data)).digest('hex')
}
