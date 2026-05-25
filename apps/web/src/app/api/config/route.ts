import { NextResponse } from 'next/server'
import { updateTag } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { configSchema } from '@/lib/validations/config'
import { logAudit } from '@/lib/audit'

const CONFIG_ID = 'default'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const config = await prisma.configEntreprise.findUnique({ where: { id: CONFIG_ID } })
  return NextResponse.json(config ?? {})
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'GERANT') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = configSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const data = parsed.data
  const existing = await prisma.configEntreprise.findUnique({ where: { id: CONFIG_ID } })

  const config = await prisma.configEntreprise.upsert({
    where: { id: CONFIG_ID },
    update: {
      ...data,
      capitalSocial: data.capitalSocial ?? null,
      siret: data.siret || null,
      tvaIntracommunautaire: data.tvaIntracommunautaire || null,
      adresse: data.adresse || null,
      codePostal: data.codePostal || null,
      ville: data.ville || null,
      telephone: data.telephone || null,
      email: data.email || null,
      iban: data.iban || null,
      rcs: data.rcs || null,
      villeRCS: data.villeRCS || null,
      codeAPE: data.codeAPE || null,
      responsableRGPD: data.responsableRGPD || null,
      emailRGPD: data.emailRGPD || null,
    },
    create: {
      id: CONFIG_ID,
      raisonSociale: data.raisonSociale,
      formeJuridique: data.formeJuridique || null,
      capitalSocial: data.capitalSocial ?? null,
      siret: data.siret || null,
      tvaIntracommunautaire: data.tvaIntracommunautaire || null,
      adresse: data.adresse || null,
      codePostal: data.codePostal || null,
      ville: data.ville || null,
      pays: data.pays,
      telephone: data.telephone || null,
      email: data.email || null,
      iban: data.iban || null,
      rcs: data.rcs || null,
      villeRCS: data.villeRCS || null,
      codeAPE: data.codeAPE || null,
      regimeTVA: data.regimeTVA,
      responsableRGPD: data.responsableRGPD || null,
      emailRGPD: data.emailRGPD || null,
    },
  })

  await logAudit({
    userId: session.user.id,
    action: existing ? 'UPDATE' : 'CREATE',
    entite: 'ConfigEntreprise',
    entiteId: CONFIG_ID,
    ancienneValeur: existing as Record<string, unknown>,
    nouvelleValeur: config as Record<string, unknown>,
  })

  updateTag('config')
  return NextResponse.json(config)
}
