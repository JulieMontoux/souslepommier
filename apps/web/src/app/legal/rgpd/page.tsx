import { DemandeRGPDForm } from '@/components/rgpd/demande-form'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'Politique de confidentialité & RGPD — Sous le Pommier',
}

export default function RgpdPage() {
  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-12 text-zinc-800">
        <h1 className="mb-2 text-3xl font-bold">Politique de confidentialité</h1>
        <p className="mb-8 text-sm text-zinc-500">
          Dernière mise à jour : mai 2026 — Conformément au Règlement (UE) 2016/679 (RGPD)
        </p>

        <section className="mb-8 space-y-3">
          <h2 className="text-lg font-semibold">1. Responsable du traitement</h2>
          <p className="text-sm leading-relaxed text-zinc-600">
            Sous le Pommier est responsable du traitement de vos données personnelles. Pour toute
            question relative à la protection de vos données, contactez notre responsable RGPD via
            le formulaire ci-dessous ou à l&apos;adresse indiquée dans la configuration de
            l&apos;entreprise.
          </p>
        </section>

        <section className="mb-8 space-y-3">
          <h2 className="text-lg font-semibold">2. Données traitées & bases légales</h2>
          <div className="overflow-hidden rounded-lg border border-zinc-200 text-sm">
            <table className="w-full">
              <thead className="bg-zinc-50">
                <tr className="text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  <th className="px-4 py-2">Donnée</th>
                  <th className="px-4 py-2">Base légale</th>
                  <th className="px-4 py-2">Conservation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {[
                  ['Compte vendeur (nom, email)', 'Contrat de travail', 'Durée contrat + 5 ans'],
                  ['Données clients pro (facturation)', 'Obligation légale', '10 ans'],
                  ['Logs de connexion', 'Intérêt légitime (sécurité)', '6 mois'],
                  ['Données ventes anonymisées', 'Intérêt légitime (statistiques)', '6 ans'],
                  ['Tickets de caisse sans nom client', 'Obligation légale (TVA 2018)', '6 ans'],
                ].map(([donnee, base, duree]) => (
                  <tr key={donnee} className="text-zinc-600">
                    <td className="px-4 py-2">{donnee}</td>
                    <td className="px-4 py-2">{base}</td>
                    <td className="px-4 py-2">{duree}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-8 space-y-3">
          <h2 className="text-lg font-semibold">3. Vos droits</h2>
          <p className="text-sm leading-relaxed text-zinc-600">
            Conformément au RGPD, vous disposez des droits suivants concernant vos données
            personnelles :
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600">
            <li>
              <strong>Droit d&apos;accès</strong> — obtenir une copie de vos données
            </li>
            <li>
              <strong>Droit de rectification</strong> — corriger des données inexactes
            </li>
            <li>
              <strong>Droit à l&apos;effacement</strong> — supprimer vos données (sauf obligation
              légale)
            </li>
            <li>
              <strong>Droit à la portabilité</strong> — recevoir vos données dans un format
              structuré
            </li>
            <li>
              <strong>Droit d&apos;opposition</strong> — vous opposer à un traitement
            </li>
          </ul>
          <p className="text-sm text-zinc-500">
            Délai de réponse : <strong>30 jours</strong> maximum (art. 12 RGPD).
          </p>
          <p className="text-sm text-zinc-500">
            En cas de réponse insatisfaisante, vous pouvez saisir la <strong>CNIL</strong>{' '}
            (Commission Nationale de l&apos;Informatique et des Libertés).
          </p>
        </section>

        <section className="mb-8 space-y-3">
          <h2 className="text-lg font-semibold">4. Sécurité</h2>
          <p className="text-sm leading-relaxed text-zinc-600">
            Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour
            protéger vos données : chiffrement des mots de passe (bcrypt), chaîne d&apos;intégrité
            HMAC-SHA256 sur les transactions, journalisation des accès.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="text-lg font-semibold">Exercer vos droits</h2>
          <p className="text-sm text-zinc-500">
            Remplissez ce formulaire pour toute demande relative à vos données personnelles.
          </p>
          <DemandeRGPDForm />
        </section>
      </div>
      <Toaster richColors position="bottom-right" />
    </>
  )
}
