import type { ConfigFormValues } from '@/lib/validations/config'

interface ConfigPreviewProps {
  config: Partial<ConfigFormValues> & { logoUrl?: string | null }
}

export function ConfigPreview({ config }: ConfigPreviewProps) {
  const now = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Aperçu ticket de caisse */}
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Aperçu ticket de caisse
        </p>
        <div className="rounded border border-zinc-200 bg-white p-4 font-mono text-xs shadow-sm">
          <div className="space-y-0.5 border-b border-dashed border-zinc-300 pb-2 text-center">
            <p className="font-bold">{config.raisonSociale || 'RAISON SOCIALE'}</p>
            {config.adresse && <p>{config.adresse}</p>}
            {(config.codePostal || config.ville) && (
              <p>
                {config.codePostal} {config.ville}
              </p>
            )}
            {config.telephone && <p>Tél : {config.telephone}</p>}
            {config.siret && <p>SIRET : {config.siret}</p>}
            {config.tvaIntracommunautaire && <p>TVA : {config.tvaIntracommunautaire}</p>}
          </div>
          <div className="space-y-0.5 border-b border-dashed border-zinc-300 py-2">
            <p>Ticket N° VTE-{now.replace(/\//g, '')}-0001</p>
            <p>
              {now} à {time}
            </p>
            <p>Vendeur : Marie</p>
          </div>
          <div className="space-y-0.5 border-b border-dashed border-zinc-300 py-2">
            <div className="flex justify-between">
              <span>Pomme 1kg × 2</span>
              <span>2,28 €</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span className="ml-2">TVA 5,5%</span>
              <span>0,12 €</span>
            </div>
          </div>
          <div className="space-y-0.5 pt-2">
            <div className="flex justify-between">
              <span>Total HT</span>
              <span>2,16 €</span>
            </div>
            <div className="flex justify-between">
              <span>TVA 5,5%</span>
              <span>0,12 €</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>TOTAL TTC</span>
              <span>2,28 €</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>Espèces</span>
              <span>5,00 €</span>
            </div>
            <div className="flex justify-between">
              <span>Rendu</span>
              <span>2,72 €</span>
            </div>
          </div>
          <p className="mt-2 border-t border-dashed border-zinc-300 pt-2 text-center text-zinc-400">
            Merci de votre visite !
          </p>
        </div>
      </div>

      {/* Aperçu en-tête facture */}
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Aperçu en-tête facture
        </p>
        <div className="rounded border border-zinc-200 bg-white p-4 text-xs shadow-sm">
          <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
            <div>
              <p className="text-base font-bold text-zinc-900">
                {config.raisonSociale || 'RAISON SOCIALE'}
              </p>
              {config.formeJuridique && (
                <p className="text-zinc-500">
                  {config.formeJuridique}
                  {config.capitalSocial ? ` — Capital ${config.capitalSocial} €` : ''}
                </p>
              )}
              {config.adresse && <p className="mt-1 text-zinc-600">{config.adresse}</p>}
              {(config.codePostal || config.ville) && (
                <p className="text-zinc-600">
                  {config.codePostal} {config.ville}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-zinc-400">FACTURE</p>
              <p className="text-zinc-500">N° FAC-{new Date().getFullYear()}-00001</p>
              <p className="text-zinc-500">{now}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold text-zinc-700">Émetteur</p>
              {config.siret && <p className="text-zinc-500">SIRET : {config.siret}</p>}
              {config.tvaIntracommunautaire && (
                <p className="text-zinc-500">TVA : {config.tvaIntracommunautaire}</p>
              )}
              {config.rcs && config.villeRCS && (
                <p className="text-zinc-500">
                  RCS {config.villeRCS} {config.rcs}
                </p>
              )}
              {config.email && <p className="text-zinc-500">{config.email}</p>}
            </div>
            <div>
              <p className="font-semibold text-zinc-700">Client</p>
              <p className="text-zinc-400 italic">Société Cliente SAS</p>
              <p className="text-zinc-400">123 rue Exemple, 75001 Paris</p>
              <p className="text-zinc-400">SIRET : 12345678900123</p>
            </div>
          </div>
          {config.iban && (
            <p className="mt-3 text-zinc-500">
              Virement : <span className="font-mono">{config.iban}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
