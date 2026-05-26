import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export type RecapVendeur = {
  vendeurId: string;
  prenom: string;
  nom: string;
  nbVentes: number;
  totalHT: number;
  totalTTC: number;
};

export type RecapTVALine = {
  taux: number;
  baseHT: number;
  montantTVA: number;
};

export type RecapProduit = {
  produitId: string;
  nom: string;
  qteTotal: number;
  montantHT: number;
};

export type VenteAnnuleeInfo = {
  numero: string;
  totalTTC: number;
  motif: string | null;
  vendeurPrenom: string;
};

export type ClotureDetail = {
  id: string;
  numeroCloture: number;
  date: string;
  createdAt: string;
  gerantId: string;
  gerantPrenom: string;
  gerantNom: string;
  nbVentes: number;
  totalEspeces: number;
  totalCB: number;
  totalCheque: number;
  totalVirement: number;
  totalTR: number;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  recapVendeurs: RecapVendeur[];
  recapTVA: RecapTVALine[];
  recapProduits: RecapProduit[];
  ventesAnnulees: VenteAnnuleeInfo[];
  hashCumulatif: string;
};

const s = StyleSheet.create({
  page: {
    width: 595.28,
    paddingHorizontal: 45,
    paddingVertical: 40,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#1a1a1a",
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 2,
  },
  subtitle: { fontSize: 9, textAlign: "center", color: "#555", marginBottom: 1 },
  company: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    marginVertical: 8,
  },
  thinDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    marginVertical: 6,
  },
  sectionTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#666",
    marginBottom: 5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  label: { fontSize: 8, color: "#444" },
  value: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  th: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#fff" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.3,
    borderBottomColor: "#eee",
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 6,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 0.3,
    borderBottomColor: "#eee",
  },
  td: { fontSize: 7.5, color: "#333" },
  section: { marginBottom: 12 },
  totalBox: { backgroundColor: "#f0f0f0", padding: 8, marginTop: 4 },
  totalTTC: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  hashBox: {
    backgroundColor: "#f8f8f8",
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#1a1a1a",
    marginTop: 4,
  },
  hashText: {
    fontSize: 6.5,
    fontFamily: "Courier",
    color: "#333",
    wordBreak: "break-all",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 45,
    right: 45,
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
    paddingTop: 5,
  },
  footerText: { fontSize: 6.5, color: "#999", textAlign: "center" },
});

function fmt(n: number) {
  return n.toFixed(2).replace(".", ",") + " €";
}

interface CloturePDFProps {
  cloture: ClotureDetail;
  raisonSociale: string;
}

export function ClotureDocument({ cloture, raisonSociale }: CloturePDFProps) {
  const date = new Date(cloture.date);
  const dateStr = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const heureStr = new Date(cloture.createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.company}>{raisonSociale}</Text>
        <Text style={s.title}>Z DE CAISSE</Text>
        <Text style={s.subtitle}>Clôture n° {cloture.numeroCloture}</Text>
        <Text style={s.subtitle}>
          {dateStr} — Clôturée à {heureStr}
        </Text>
        <Text style={[s.subtitle, { marginTop: 2 }]}>
          Gérant : {cloture.gerantPrenom} {cloture.gerantNom}
        </Text>

        <View style={s.divider} />

        {cloture.recapVendeurs.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Récapitulatif par vendeur</Text>
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 3 }]}>Vendeur</Text>
              <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Ventes</Text>
              <Text style={[s.th, { flex: 2, textAlign: "right" }]}>CA HT</Text>
              <Text style={[s.th, { flex: 2, textAlign: "right" }]}>CA TTC</Text>
            </View>
            {cloture.recapVendeurs.map((v, i) => (
              <View
                key={v.vendeurId}
                style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}
              >
                <Text style={[s.td, { flex: 3 }]}>
                  {v.prenom} {v.nom}
                </Text>
                <Text style={[s.td, { flex: 1, textAlign: "right" }]}>
                  {v.nbVentes}
                </Text>
                <Text style={[s.td, { flex: 2, textAlign: "right" }]}>
                  {fmt(v.totalHT)}
                </Text>
                <Text style={[s.td, { flex: 2, textAlign: "right" }]}>
                  {fmt(v.totalTTC)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.thinDivider} />

        <View style={s.section}>
          <Text style={s.sectionTitle}>Récapitulatif par mode de paiement</Text>
          {[
            { label: "Espèces (net)", value: cloture.totalEspeces },
            { label: "Carte bancaire", value: cloture.totalCB },
            { label: "Chèque", value: cloture.totalCheque },
            { label: "Virement", value: cloture.totalVirement },
            { label: "Ticket restaurant", value: cloture.totalTR },
          ]
            .filter((r) => r.value !== 0)
            .map((r) => (
              <View key={r.label} style={s.row}>
                <Text style={s.label}>{r.label}</Text>
                <Text style={s.value}>{fmt(r.value)}</Text>
              </View>
            ))}
        </View>

        <View style={s.thinDivider} />

        {cloture.recapTVA.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Récapitulatif TVA</Text>
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 1 }]}>Taux</Text>
              <Text style={[s.th, { flex: 2, textAlign: "right" }]}>
                Base HT
              </Text>
              <Text style={[s.th, { flex: 2, textAlign: "right" }]}>
                TVA collectée
              </Text>
            </View>
            {cloture.recapTVA.map((t, i) => (
              <View
                key={t.taux}
                style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}
              >
                <Text style={[s.td, { flex: 1 }]}>{t.taux}%</Text>
                <Text style={[s.td, { flex: 2, textAlign: "right" }]}>
                  {fmt(t.baseHT)}
                </Text>
                <Text style={[s.td, { flex: 2, textAlign: "right" }]}>
                  {fmt(t.montantTVA)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.thinDivider} />

        {cloture.recapProduits.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Top produits</Text>
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 4 }]}>Produit</Text>
              <Text style={[s.th, { flex: 1.5, textAlign: "right" }]}>Qté</Text>
              <Text style={[s.th, { flex: 2, textAlign: "right" }]}>CA HT</Text>
            </View>
            {cloture.recapProduits.map((p, i) => (
              <View
                key={p.produitId}
                style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}
              >
                <Text style={[s.td, { flex: 4 }]}>{p.nom}</Text>
                <Text style={[s.td, { flex: 1.5, textAlign: "right" }]}>
                  {p.qteTotal.toFixed(3).replace(".", ",")}
                </Text>
                <Text style={[s.td, { flex: 2, textAlign: "right" }]}>
                  {fmt(p.montantHT)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {cloture.ventesAnnulees.length > 0 && (
          <>
            <View style={s.thinDivider} />
            <View style={s.section}>
              <Text style={s.sectionTitle}>Ventes annulées</Text>
              {cloture.ventesAnnulees.map((v) => (
                <View key={v.numero} style={s.row}>
                  <Text style={s.label}>
                    {v.numero} ({v.vendeurPrenom})
                    {v.motif ? ` — ${v.motif}` : ""}
                  </Text>
                  <Text style={[s.label, { color: "#c00" }]}>
                    {fmt(v.totalTTC)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={s.divider} />

        <View style={s.totalBox}>
          <View style={s.row}>
            <Text style={s.label}>Nombre de ventes</Text>
            <Text style={s.value}>{cloture.nbVentes}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Total HT</Text>
            <Text style={s.value}>{fmt(cloture.totalHT)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Total TVA</Text>
            <Text style={s.value}>{fmt(cloture.totalTVA)}</Text>
          </View>
          <View style={[s.row, { marginTop: 4 }]}>
            <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold" }}>
              TOTAL TTC
            </Text>
            <Text style={s.totalTTC}>{fmt(cloture.totalTTC)}</Text>
          </View>
        </View>

        <View style={[s.hashBox, { marginTop: 12 }]}>
          <Text style={[s.sectionTitle, { marginBottom: 3 }]}>
            Signature d'intégrité (HMAC-SHA256)
          </Text>
          <Text style={s.hashText}>{cloture.hashCumulatif}</Text>
          <Text style={[s.label, { marginTop: 4, color: "#888" }]}>
            Clôture n° {cloture.numeroCloture} — Conforme loi anti-fraude TVA
            2018 (art. 88)
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Document irréversible — Archivage obligatoire 6 ans — Généré le{" "}
            {new Date(cloture.createdAt).toLocaleString("fr-FR")}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
