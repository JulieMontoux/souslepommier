import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { recapTVA } from '@/lib/tva'
import type { FactureDetail } from '@/types/facture'

const A4_W = 595.28

const s = StyleSheet.create({
  page: {
    width: A4_W,
    paddingHorizontal: 45,
    paddingVertical: 45,
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#1a1a1a',
  },
  // Watermark
  watermark: {
    position: 'absolute',
    top: 280,
    left: 80,
    fontSize: 90,
    color: '#FF0000',
    opacity: 0.08,
    fontFamily: 'Helvetica-Bold',
    transform: 'rotate(-30deg)',
  },
  // Layout
  row: { flexDirection: 'row' },
  col: { flex: 1 },
  // Header
  doctitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#1a1a1a', marginBottom: 2 },
  docnumber: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#4a4a4a' },
  companyName: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  small: { fontSize: 7, color: '#666', marginBottom: 1 },
  smallBold: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#444' },
  // Sections
  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  line: { borderBottomWidth: 0.5, borderBottomColor: '#ddd', marginVertical: 8 },
  thickLine: { borderBottomWidth: 1, borderBottomColor: '#1a1a1a', marginVertical: 8 },
  // Client block
  clientBox: { backgroundColor: '#f8f8f8', padding: 10, borderRadius: 3, marginBottom: 12 },
  clientName: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: '#1a1a1a', padding: 5, marginBottom: 0 },
  tableHeaderText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#fff' },
  tableRow: { flexDirection: 'row', padding: 5, borderBottomWidth: 0.3, borderBottomColor: '#eee' },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 5,
    backgroundColor: '#fafafa',
    borderBottomWidth: 0.3,
    borderBottomColor: '#eee',
  },
  // Totals
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalTTCRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginTop: 2,
  },
  totalLabel: { fontSize: 8, color: '#555' },
  totalValue: { fontSize: 8, color: '#555' },
  totalTTCLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  totalTTCValue: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  // Legal
  legal: { fontSize: 6.5, color: '#888', marginBottom: 1 },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 45,
    right: 45,
    borderTopWidth: 0.5,
    borderTopColor: '#ccc',
    paddingTop: 6,
  },
  footerText: { fontSize: 6.5, color: '#888', textAlign: 'center' },
})

function fmt(n: number) {
  return n.toFixed(2).replace('.', ',') + ' €'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR')
}

const CONDITIONS_LABELS: Record<number, string> = {
  0: 'Comptant',
  30: '30 jours',
  45: '45 jours',
  60: '60 jours',
}

interface FacturePDFProps {
  facture: FactureDetail
  config: {
    raisonSociale: string
    formeJuridique: string | null
    capitalSocial: number | null
    siret: string | null
    tvaIntracommunautaire: string | null
    adresse: string | null
    codePostal: string | null
    ville: string | null
    telephone: string | null
    email: string | null
    iban: string | null
    rcs: string | null
    villeRCS: string | null
    regimeTVA: string
  } | null
}

export function FactureDocument({ facture, config }: FacturePDFProps) {
  const isAvoir = !!facture.factureOriginaleId
  const docTitle = isAvoir ? 'AVOIR' : 'FACTURE'
  const tvaRecap = recapTVA(
    facture.lignes.map((l) => ({ tauxTVA: l.tauxTVA, montantHT: l.montantHT }))
  )
  const conditions =
    CONDITIONS_LABELS[facture.client.conditionsPaiement] ??
    `${facture.client.conditionsPaiement} jours`
  const franchise = config?.regimeTVA === 'FRANCHISE'

  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        {/* Watermark AVOIR */}
        {isAvoir && <Text style={s.watermark}>AVOIR</Text>}

        {/* Header : vendeur à gauche, document à droite */}
        <View style={[s.row, s.section]}>
          <View style={s.col}>
            <Text style={s.companyName}>{config?.raisonSociale ?? 'Sous le Pommier'}</Text>
            {config?.adresse && <Text style={s.small}>{config.adresse}</Text>}
            {(config?.codePostal || config?.ville) && (
              <Text style={s.small}>
                {[config.codePostal, config.ville].filter(Boolean).join(' ')}
              </Text>
            )}
            {config?.telephone && <Text style={s.small}>Tél. {config.telephone}</Text>}
            {config?.email && <Text style={s.small}>{config.email}</Text>}
            {config?.siret && <Text style={s.small}>SIRET : {config.siret}</Text>}
            {config?.tvaIntracommunautaire && (
              <Text style={s.small}>N° TVA : {config.tvaIntracommunautaire}</Text>
            )}
          </View>
          <View style={{ width: 200, alignItems: 'flex-end' }}>
            <Text style={s.doctitle}>{docTitle}</Text>
            <Text style={s.docnumber}>{facture.numero}</Text>
            {isAvoir && facture.factureOriginaleId && (
              <Text style={[s.small, { marginTop: 2 }]}>
                Réf. facture : {facture.factureOriginaleId}
              </Text>
            )}
            <View style={{ marginTop: 8 }}>
              <Text style={s.small}>Date : {fmtDate(facture.dateEmission)}</Text>
              {facture.dateLivraison && (
                <Text style={s.small}>Date prestation : {fmtDate(facture.dateLivraison)}</Text>
              )}
              {facture.dateEcheance && !isAvoir && (
                <Text style={s.small}>Échéance : {fmtDate(facture.dateEcheance)}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={s.thickLine} />

        {/* Bloc client */}
        <View style={s.clientBox}>
          <Text style={s.sectionTitle}>Facturé à</Text>
          <Text style={s.clientName}>{facture.client.raisonSociale}</Text>
          {facture.client.adresse && <Text style={s.small}>{facture.client.adresse}</Text>}
          {(facture.client.codePostal || facture.client.ville) && (
            <Text style={s.small}>
              {[facture.client.codePostal, facture.client.ville].filter(Boolean).join(' ')}
            </Text>
          )}
          {facture.client.siret && <Text style={s.small}>SIRET : {facture.client.siret}</Text>}
          {facture.client.tvaIntracommunautaire && (
            <Text style={s.small}>N° TVA : {facture.client.tvaIntracommunautaire}</Text>
          )}
        </View>

        {/* Tableau lignes */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, { flex: 4 }]}>Désignation</Text>
          <Text style={[s.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Qté</Text>
          <Text style={[s.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>PU HT</Text>
          <Text style={[s.tableHeaderText, { flex: 1, textAlign: 'right' }]}>TVA</Text>
          {facture.lignes.some((l) => l.remise > 0) && (
            <Text style={[s.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Remise</Text>
          )}
          <Text style={[s.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>HT</Text>
        </View>

        {facture.lignes.map((l, i) => {
          const rowStyle = i % 2 === 0 ? s.tableRow : s.tableRowAlt
          const hasRemise = facture.lignes.some((x) => x.remise > 0)
          return (
            <View key={l.id} style={rowStyle}>
              <Text style={{ flex: 4, fontSize: 8 }}>{l.designation}</Text>
              <Text style={{ flex: 1, textAlign: 'right', fontSize: 8 }}>{l.qte}</Text>
              <Text style={{ flex: 1.5, textAlign: 'right', fontSize: 8 }}>
                {l.prixUnitaireHT.toFixed(2).replace('.', ',')}
              </Text>
              <Text style={{ flex: 1, textAlign: 'right', fontSize: 8 }}>
                {franchise ? 'Exo.' : `${l.tauxTVA}%`}
              </Text>
              {hasRemise && (
                <Text style={{ flex: 1, textAlign: 'right', fontSize: 8 }}>
                  {l.remise > 0 ? `${l.remise}%` : '—'}
                </Text>
              )}
              <Text style={{ flex: 1.5, textAlign: 'right', fontSize: 8 }}>
                {l.montantHT.toFixed(2).replace('.', ',')}
              </Text>
            </View>
          )
        })}

        <View style={s.line} />

        {/* Recap TVA + Totaux côte à côte */}
        <View style={s.row}>
          {/* Récap TVA à gauche */}
          <View style={{ flex: 1 }}>
            {!franchise && tvaRecap.length > 0 && (
              <>
                <Text style={s.sectionTitle}>Récapitulatif TVA</Text>
                <View style={{ flexDirection: 'row', marginBottom: 3 }}>
                  <Text style={[s.smallBold, { flex: 1 }]}>Taux</Text>
                  <Text style={[s.smallBold, { flex: 1.5, textAlign: 'right' }]}>Base HT</Text>
                  <Text style={[s.smallBold, { flex: 1.5, textAlign: 'right' }]}>TVA</Text>
                </View>
                {tvaRecap.map((t, i) => (
                  <View key={i} style={{ flexDirection: 'row' }}>
                    <Text style={[s.small, { flex: 1 }]}>{t.taux}%</Text>
                    <Text style={[s.small, { flex: 1.5, textAlign: 'right' }]}>
                      {fmt(t.baseHT)}
                    </Text>
                    <Text style={[s.small, { flex: 1.5, textAlign: 'right' }]}>
                      {fmt(t.montantTVA)}
                    </Text>
                  </View>
                ))}
                {franchise && (
                  <Text style={[s.small, { marginTop: 3, fontStyle: 'italic' }]}>
                    TVA non applicable, art. 293 B du CGI
                  </Text>
                )}
              </>
            )}
            {franchise && (
              <Text style={[s.small, { marginTop: 3, fontStyle: 'italic' }]}>
                TVA non applicable, art. 293 B du CGI
              </Text>
            )}
          </View>

          {/* Totaux à droite */}
          <View style={{ width: 200 }}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total HT</Text>
              <Text style={s.totalValue}>{fmt(facture.totalHT)}</Text>
            </View>
            {!franchise && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Total TVA</Text>
                <Text style={s.totalValue}>{fmt(facture.totalTVA)}</Text>
              </View>
            )}
            <View style={[s.thickLine, { marginVertical: 4 }]} />
            <View style={s.totalTTCRow}>
              <Text style={s.totalTTCLabel}>TOTAL TTC</Text>
              <Text style={s.totalTTCValue}>{fmt(facture.totalTTC)}</Text>
            </View>
          </View>
        </View>

        <View style={s.line} />

        {/* Conditions de paiement + IBAN */}
        {!isAvoir && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Règlement</Text>
            <Text style={s.small}>Conditions : {conditions}</Text>
            {config?.iban && <Text style={s.small}>IBAN : {config.iban}</Text>}
          </View>
        )}

        {/* Notes */}
        {facture.notes && (
          <View style={[s.section, { marginBottom: 8 }]}>
            <Text style={s.sectionTitle}>Notes</Text>
            <Text style={s.small}>{facture.notes}</Text>
          </View>
        )}

        {/* Mentions légales pénalités */}
        {!isAvoir && (
          <View>
            <Text style={s.legal}>
              En cas de retard de paiement, des pénalités de retard au taux légal majoré de 10
              points seront appliquées, ainsi qu&apos;une indemnité forfaitaire de recouvrement de
              40 € (art. L441-10 C. com.).
            </Text>
            <Text style={s.legal}>Pas d&apos;escompte pour paiement anticipé.</Text>
          </View>
        )}

        {/* Pied de page */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {[
              config?.raisonSociale,
              config?.formeJuridique,
              config?.capitalSocial != null
                ? `Capital : ${Number(config.capitalSocial).toFixed(2).replace('.', ',')} €`
                : null,
              config?.siret ? `SIRET : ${config.siret}` : null,
              config?.villeRCS && config?.rcs ? `RCS ${config.villeRCS} ${config.rcs}` : null,
            ]
              .filter(Boolean)
              .join(' — ')}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
