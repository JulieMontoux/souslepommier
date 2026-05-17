import { createHmac } from 'crypto'

export function computeClotureHash(data: {
  numero: number
  date: string
  totalTTC: string
  gerantId: string
  hashPrecedent: string | null
}): string {
  if (!process.env.SIGNING_SECRET) {
    throw new Error('SIGNING_SECRET environment variable is not set')
  }
  return createHmac('sha256', process.env.SIGNING_SECRET)
    .update(JSON.stringify(data))
    .digest('hex')
}
