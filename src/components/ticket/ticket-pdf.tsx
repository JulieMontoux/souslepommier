import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { TicketVente, ConfigTicket } from '@/types/ticket'

// 80mm thermal ticket = 226.77pt
const W = 226.77

const s = StyleSheet.create({
  page: {
    width: W,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: '#000',
  },
  center: { textAlign: 'center' },
  bold: { fontFamily: 'Helvetica-Bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
  line: { borderBottomWidth: 0.5, borderBottomColor: '#000', marginVertical: 4 },
  small: { fontSize: 6, color: '#555' },
  h1: { fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 1 },
  h2: { fontSize: 7, fontFamily: 'Helvetica-Bold', marginTop: 3, marginBottom: 2 },
  mono: { fontFamily: 'Courier' },
})

const MODE_LABELS: Record<string, string> = {
  ESPECES: 'Espèces',
  CB: 'Carte bancaire',
  CHEQUE: 'Chèque',
  VIREMENT: 'Virement',
  TICKET_RESTO: 'Ticket restaurant',
}

function fmt(n: number) {
  return n.toFixed(2).replace('.', ',') + ' €'
}

interface TicketDocumentProps {
  vente: TicketVente
  config: ConfigTicket
}

export function TicketDocument({ vente, config }: TicketDocumentProps) {
  const date = new Date(vente.date)
  const dateStr = date.toLocaleDateString('fr-FR')
  const heureStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <Document>
      <Page size={{ width: W, height: undefined as unknown as number }} style={s.page} wrap>
        {/* En-tête vendeur */}
        {config ? (
          <>
            <Text style={s.h1}>{config.raisonSociale}</Text>
            {config.adresse && <Text style={[s.center, s.small]}>{config.adresse}</Text>}
            {(config.codePostal || config.ville) && (
              <Text style={[s.center, s.small]}>
                {[config.codePostal, config.ville].filter(Boolean).join(' ')}
              </Text>
            )}
            {config.telephone && <Text style={[s.center, s.small]}>Tél. {config.telephone}</Text>}
            {config.siret && <Text style={[s.center, s.small]}>SIRET : {config.siret}</Text>}
            {config.tvaIntracommunautaire && (
              <Text style={[s.center, s.small]}>N° TVA : {config.tvaIntracommunautaire}</Text>
            )}
          </>
        ) : (
          <Text style={s.h1}>Sous le Pommier</Text>
        )}

        <View style={s.line} />

        {/* Infos ticket */}
        <View style={s.row}>
          <Text style={s.bold}>Ticket n°</Text>
          <Text style={s.mono}>{vente.numeroTicket}</Text>
        </View>
        <View style={s.row}>
          <Text>Date</Text>
          <Text>
            {dateStr} {heureStr}
          </Text>
        </View>
        <View style={s.row}>
          <Text>Vendeur</Text>
          <Text>{vente.vendeurPrenom}</Text>
        </View>

        <View style={s.line} />

        {/* Entête colonnes */}
        <Text style={s.h2}>ARTICLES</Text>
        <View style={[s.row, { marginBottom: 2 }]}>
          <Text style={[s.small, { flex: 3 }]}>Désignation</Text>
          <Text style={[s.small, { flex: 1, textAlign: 'center' }]}>Qté</Text>
          <Text style={[s.small, { flex: 1, textAlign: 'right' }]}>P.U. HT</Text>
          <Text style={[s.small, { flex: 1, textAlign: 'right' }]}>TVA</Text>
          <Text style={[s.small, { flex: 1.2, textAlign: 'right' }]}>TTC</Text>
        </View>

        {/* Lignes articles */}
        {vente.lignes.map((l, i) => (
          <View key={i} style={s.row}>
            <Text style={{ flex: 3 }}>{l.designation}</Text>
            <Text style={{ flex: 1, textAlign: 'center' }}>{l.qte}</Text>
            <Text style={{ flex: 1, textAlign: 'right' }}>
              {l.prixUnitaireHT.toFixed(2).replace('.', ',')}
            </Text>
            <Text style={{ flex: 1, textAlign: 'right' }}>{l.tauxTVA}%</Text>
            <Text style={{ flex: 1.2, textAlign: 'right' }}>{fmt(l.montantTTC)}</Text>
          </View>
        ))}

        <View style={s.line} />

        {/* Récap TVA */}
        <Text style={s.h2}>RÉCAPITULATIF TVA</Text>
        <View style={[s.row, { marginBottom: 1 }]}>
          <Text style={s.small}>Taux</Text>
          <Text style={s.small}>Base HT</Text>
          <Text style={s.small}>TVA</Text>
        </View>
        {vente.recapTaxes.map((t, i) => (
          <View key={i} style={s.row}>
            <Text>{t.taux}%</Text>
            <Text>{fmt(t.baseHT)}</Text>
            <Text>{fmt(t.montantTVA)}</Text>
          </View>
        ))}

        <View style={s.line} />

        {/* Totaux */}
        <View style={s.row}>
          <Text>Total HT</Text>
          <Text>{fmt(vente.totalHT)}</Text>
        </View>
        <View style={s.row}>
          <Text>Total TVA</Text>
          <Text>{fmt(vente.totalTVA)}</Text>
        </View>
        <View style={[s.row, { marginTop: 2 }]}>
          <Text style={[s.bold, { fontSize: 9 }]}>TOTAL TTC</Text>
          <Text style={[s.bold, { fontSize: 9 }]}>{fmt(vente.totalTTC)}</Text>
        </View>

        <View style={s.line} />

        {/* Paiements */}
        <Text style={s.h2}>RÈGLEMENT</Text>
        {vente.paiements.map((p, i) => (
          <React.Fragment key={i}>
            <View style={s.row}>
              <Text>{MODE_LABELS[p.mode] ?? p.mode}</Text>
              <Text>{fmt(p.montant)}</Text>
            </View>
            {p.reference && (
              <Text style={[s.small, { marginLeft: 8, marginBottom: 1 }]}>Réf. {p.reference}</Text>
            )}
            {p.renduMonnaie > 0 && (
              <View style={s.row}>
                <Text style={s.bold}>Rendu monnaie</Text>
                <Text style={s.bold}>{fmt(p.renduMonnaie)}</Text>
              </View>
            )}
          </React.Fragment>
        ))}

        <View style={s.line} />

        {/* Pied de page légal */}
        <Text style={[s.center, s.small, { marginTop: 2 }]}>Merci de votre visite !</Text>
        <Text style={[s.center, s.small]}>Ticket dématérialisé — conservez ce justificatif</Text>
        <Text style={[s.center, s.small]}>
          Document de caisse soumis à la loi anti-fraude TVA 2018
        </Text>
      </Page>
    </Document>
  )
}
