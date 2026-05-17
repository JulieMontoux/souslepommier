import { prisma } from '@/lib/prisma'
import { ConfigForm } from '@/components/config/config-form'
import { Toaster } from '@/components/ui/sonner'

export const metadata = { title: 'Configuration — Sous le Pommier' }

export default async function ConfigurationPage() {
  const config = await prisma.configEntreprise.findUnique({ where: { id: 'default' } })

  return (
    <>
      <ConfigForm
        initialConfig={
          config
            ? {
                raisonSociale: config.raisonSociale,
                formeJuridique: config.formeJuridique ?? undefined,
                capitalSocial: config.capitalSocial ? Number(config.capitalSocial) : undefined,
                siret: config.siret ?? '',
                tvaIntracommunautaire: config.tvaIntracommunautaire ?? '',
                adresse: config.adresse ?? '',
                codePostal: config.codePostal ?? '',
                ville: config.ville ?? '',
                pays: config.pays,
                telephone: config.telephone ?? '',
                email: config.email ?? '',
                iban: config.iban ?? '',
                rcs: config.rcs ?? '',
                villeRCS: config.villeRCS ?? '',
                codeAPE: config.codeAPE ?? '',
                regimeTVA: (config.regimeTVA as 'NORMAL' | 'SIMPLIFIE' | 'FRANCHISE') ?? 'NORMAL',
                responsableRGPD: config.responsableRGPD ?? '',
                emailRGPD: config.emailRGPD ?? '',
                logoUrl: config.logoUrl,
              }
            : null
        }
      />
      <Toaster richColors position="bottom-right" />
    </>
  )
}
