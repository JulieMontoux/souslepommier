import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export type BLClientInfo = {
  raisonSociale: string;
  siret: string | null;
  tvaIntracommunautaire: string | null;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  pays: string;
  email: string | null;
  telephone: string | null;
};

export type LigneBL = {
  id: string;
  designation: string;
  qte: number;
  unite: string | null;
  prixUnitaireHT: number;
  remise: number;
  montantHT: number;
};

export type BLDetail = {
  id: string;
  numero: string;
  clientId: string;
  venteId: string | null;
  dateEmission: string;
  dateLivraison: string | null;
  statut: "BROUILLON" | "EMIS" | "LIVRE" | "ANNULE";
  totalHT: number;
  remiseCommerciale: number | null;
  notes: string | null;
  client: BLClientInfo;
  lignes: LigneBL[];
};

const A4_W = 595.28;

const s = StyleSheet.create({
  page: {
    width: A4_W,
    paddingHorizontal: 45,
    paddingVertical: 45,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#1a1a1a",
  },
  row: { flexDirection: "row" },
  col: { flex: 1 },
  doctitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  docnumber: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#4a4a4a" },
  companyName: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  small: { fontSize: 7, color: "#666", marginBottom: 1 },
  smallBold: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#444" },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#888",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  line: { borderBottomWidth: 0.5, borderBottomColor: "#ddd", marginVertical: 8 },
  thickLine: { borderBottomWidth: 1, borderBottomColor: "#1a1a1a", marginVertical: 8 },
  clientBox: {
    backgroundColor: "#f8f8f8",
    padding: 10,
    borderRadius: 3,
    marginBottom: 12,
  },
  clientName: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    padding: 5,
  },
  tableHeaderText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#fff" },
  tableRow: {
    flexDirection: "row",
    padding: 5,
    borderBottomWidth: 0.3,
    borderBottomColor: "#eee",
  },
  tableRowAlt: {
    flexDirection: "row",
    padding: 5,
    backgroundColor: "#fafafa",
    borderBottomWidth: 0.3,
    borderBottomColor: "#eee",
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalTTCRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, marginTop: 2 },
  totalLabel: { fontSize: 8, color: "#555" },
  totalValue: { fontSize: 8, color: "#555" },
  totalHTLabel: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  totalHTValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 45,
    right: 45,
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
    paddingTop: 6,
  },
  footerText: { fontSize: 6.5, color: "#888", textAlign: "center" },
  statutBadge: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#888",
    border: 1,
    borderColor: "#ccc",
    padding: 3,
    marginTop: 4,
    textAlign: "center",
  },
});

function fmt(n: number) {
  return n.toFixed(2).replace(".", ",") + " €";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR");
}

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "BROUILLON",
  EMIS: "ÉMIS",
  LIVRE: "LIVRÉ",
  ANNULE: "ANNULÉ",
};

interface BonLivraisonPDFProps {
  bl: BLDetail;
  config: {
    raisonSociale: string;
    siret: string | null;
    tvaIntracommunautaire: string | null;
    adresse: string | null;
    codePostal: string | null;
    ville: string | null;
    telephone: string | null;
    email: string | null;
  } | null;
}

export function BonLivraisonDocument({ bl, config }: BonLivraisonPDFProps) {
  const remiseFactor = bl.remiseCommerciale ? 1 - bl.remiseCommerciale / 100 : 1;
  const totalHTBrut = bl.lignes.reduce((s, l) => s + l.montantHT, 0);

  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        {/* Header */}
        <View style={[s.row, s.section]}>
          <View style={s.col}>
            <Text style={s.companyName}>{config?.raisonSociale ?? ""}</Text>
            {config?.adresse && <Text style={s.small}>{config.adresse}</Text>}
            {(config?.codePostal || config?.ville) && (
              <Text style={s.small}>
                {[config.codePostal, config.ville].filter(Boolean).join(" ")}
              </Text>
            )}
            {config?.telephone && <Text style={s.small}>Tél. {config.telephone}</Text>}
            {config?.email && <Text style={s.small}>{config.email}</Text>}
            {config?.siret && <Text style={s.small}>SIRET : {config.siret}</Text>}
            {config?.tvaIntracommunautaire && (
              <Text style={s.small}>N° TVA : {config.tvaIntracommunautaire}</Text>
            )}
          </View>
          <View style={{ width: 200, alignItems: "flex-end" }}>
            <Text style={s.doctitle}>BON DE LIVRAISON</Text>
            <Text style={s.docnumber}>{bl.numero}</Text>
            <Text style={s.statutBadge}>{STATUT_LABELS[bl.statut] ?? bl.statut}</Text>
            <View style={{ marginTop: 8 }}>
              <Text style={s.small}>Émission : {fmtDate(bl.dateEmission)}</Text>
              {bl.dateLivraison && (
                <Text style={s.small}>Livraison : {fmtDate(bl.dateLivraison)}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={s.thickLine} />

        {/* Client */}
        <View style={s.clientBox}>
          <Text style={s.sectionTitle}>Livré à</Text>
          <Text style={s.clientName}>{bl.client.raisonSociale}</Text>
          {bl.client.adresse && <Text style={s.small}>{bl.client.adresse}</Text>}
          {(bl.client.codePostal || bl.client.ville) && (
            <Text style={s.small}>
              {[bl.client.codePostal, bl.client.ville].filter(Boolean).join(" ")}
            </Text>
          )}
          {bl.client.siret && <Text style={s.small}>SIRET : {bl.client.siret}</Text>}
        </View>

        {/* Lines table */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, { flex: 5 }]}>Désignation</Text>
          <Text style={[s.tableHeaderText, { flex: 1.5, textAlign: "right" }]}>Qté</Text>
          <Text style={[s.tableHeaderText, { flex: 1.5, textAlign: "right" }]}>Unité</Text>
          <Text style={[s.tableHeaderText, { flex: 2, textAlign: "right" }]}>PU HT</Text>
          {bl.lignes.some((l) => l.remise > 0) && (
            <Text style={[s.tableHeaderText, { flex: 1.5, textAlign: "right" }]}>Remise</Text>
          )}
          <Text style={[s.tableHeaderText, { flex: 2, textAlign: "right" }]}>HT</Text>
        </View>

        {bl.lignes.map((l, i) => {
          const rowStyle = i % 2 === 0 ? s.tableRow : s.tableRowAlt;
          const hasRemise = bl.lignes.some((x) => x.remise > 0);
          return (
            <View key={l.id} style={rowStyle}>
              <Text style={{ flex: 5, fontSize: 8 }}>{l.designation}</Text>
              <Text style={{ flex: 1.5, textAlign: "right", fontSize: 8 }}>
                {Number(l.qte) % 1 === 0 ? l.qte : Number(l.qte).toFixed(3).replace(".", ",")}
              </Text>
              <Text style={{ flex: 1.5, textAlign: "right", fontSize: 8 }}>
                {l.unite ?? "—"}
              </Text>
              <Text style={{ flex: 2, textAlign: "right", fontSize: 8 }}>
                {l.prixUnitaireHT.toFixed(2).replace(".", ",")}
              </Text>
              {hasRemise && (
                <Text style={{ flex: 1.5, textAlign: "right", fontSize: 8 }}>
                  {l.remise > 0 ? `${l.remise}%` : "—"}
                </Text>
              )}
              <Text style={{ flex: 2, textAlign: "right", fontSize: 8 }}>
                {l.montantHT.toFixed(2).replace(".", ",")}
              </Text>
            </View>
          );
        })}

        <View style={s.line} />

        {/* Totals */}
        <View style={{ alignItems: "flex-end" }}>
          <View style={{ width: 200 }}>
            {bl.remiseCommerciale ? (
              <>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Total brut HT</Text>
                  <Text style={s.totalValue}>{fmt(totalHTBrut)}</Text>
                </View>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Remise {bl.remiseCommerciale}%</Text>
                  <Text style={s.totalValue}>
                    -{fmt(totalHTBrut * bl.remiseCommerciale / 100)}
                  </Text>
                </View>
              </>
            ) : null}
            <View style={[s.thickLine, { marginVertical: 4 }]} />
            <View style={s.totalTTCRow}>
              <Text style={s.totalHTLabel}>TOTAL HT</Text>
              <Text style={s.totalHTValue}>{fmt(bl.totalHT)}</Text>
            </View>
            <Text style={[s.small, { textAlign: "right", marginTop: 2, fontStyle: "italic" }]}>
              TVA non applicable sur bon de livraison
            </Text>
          </View>
        </View>

        {/* Notes */}
        {bl.notes && (
          <>
            <View style={s.line} />
            <View style={s.section}>
              <Text style={s.sectionTitle}>Notes</Text>
              <Text style={s.small}>{bl.notes}</Text>
            </View>
          </>
        )}

        {/* Signature zone */}
        <View style={[s.line, { marginTop: 20 }]} />
        <View style={[s.row, { marginTop: 8 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>Signature émetteur</Text>
            <View style={{ height: 40, borderWidth: 0.5, borderColor: "#ddd", borderRadius: 2 }} />
          </View>
          <View style={{ width: 20 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>Signature réceptionnaire</Text>
            <View style={{ height: 40, borderWidth: 0.5, borderColor: "#ddd", borderRadius: 2 }} />
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {[
              config?.raisonSociale,
              config?.siret ? `SIRET : ${config.siret}` : null,
              config?.tvaIntracommunautaire ? `N° TVA : ${config.tvaIntracommunautaire}` : null,
            ]
              .filter(Boolean)
              .join(" — ")}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
