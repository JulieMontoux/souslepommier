import { createHmac } from "crypto";
import { prisma } from "./prisma.js";

export type LigneVenteInput = {
  varianteProduitId: string;
  qte: number;
  remise?: number;
};

export type PaiementVenteInput = {
  mode: "ESPECES" | "CB" | "CHEQUE" | "VIREMENT" | "TICKET_RESTO";
  montant: number;
  reference?: string;
  renduMonnaie?: number;
};

type VenteError = Error & { status: number };
function venteError(msg: string, status: number): VenteError {
  return Object.assign(new Error(msg), { status });
}

export async function createVente(
  vendeurId: string,
  lignes: LigneVenteInput[],
  paiements: PaiementVenteInput[],
  options?: {
    dateOverride?: Date;
    skipClotureCheck?: boolean;
    pointDeVenteId?: string;
    clientId?: string;
  },
) {
  const now = options?.dateOverride ?? new Date();

  if (!options?.skipClotureCheck) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const cloture = await prisma.clotureCaisse.findFirst({
      where: { date: { gte: today, lt: tomorrow } },
    });
    if (cloture)
      throw venteError("La caisse est clôturée pour aujourd'hui", 409);
  }

  const varianteIds = lignes.map((l) => l.varianteProduitId);
  const variantes = await prisma.varianteProduit.findMany({
    where: { id: { in: varianteIds } },
  });

  const lignesComputed = lignes.map((l) => {
    const v = variantes.find((x) => x.id === l.varianteProduitId);
    if (!v)
      throw venteError(`Variante ${l.varianteProduitId} introuvable`, 404);
    const remise = l.remise ?? 0;
    const prixUnitaireHT = Number(v.prixHT);
    const tauxTVA = Number(v.tauxTVA);
    const montantHT =
      Math.round(prixUnitaireHT * l.qte * (1 - remise / 100) * 10000) / 10000;
    const montantTVA = Math.round(montantHT * (tauxTVA / 100) * 10000) / 10000;
    const montantTTC = Math.round((montantHT + montantTVA) * 10000) / 10000;
    return {
      varianteProduitId: l.varianteProduitId,
      qte: l.qte,
      prixUnitaireHT,
      tauxTVA,
      montantHT,
      montantTVA,
      montantTTC,
      remise,
    };
  });

  const totalHT =
    Math.round(lignesComputed.reduce((s, l) => s + l.montantHT, 0) * 10000) /
    10000;
  const totalTVA =
    Math.round(lignesComputed.reduce((s, l) => s + l.montantTVA, 0) * 10000) /
    10000;
  const totalTTC =
    Math.round(lignesComputed.reduce((s, l) => s + l.montantTTC, 0) * 10000) /
    10000;

  return prisma.$transaction(async (tx) => {
    const year = now.getFullYear();
    const lastVente = await tx.vente.findFirst({
      where: { numeroTicket: { startsWith: `T-${year}-` } },
      orderBy: { numeroTicket: "desc" },
    });
    let seq = 1;
    if (lastVente) {
      const parts = lastVente.numeroTicket.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    const numeroTicket = `T-${year}-${String(seq).padStart(6, "0")}`;

    const lastFinalisee = await tx.vente.findFirst({
      where: { statut: "FINALISEE" },
      orderBy: { createdAt: "desc" },
      select: { hash: true },
    });
    const hashPrecedent = lastFinalisee?.hash ?? null;
    const hash = createHmac("sha256", process.env.SIGNING_SECRET ?? "")
      .update(
        JSON.stringify({
          numero: numeroTicket,
          date: now.toISOString(),
          totalTTC: String(totalTTC),
          vendeurId,
          hashPrecedent,
        }),
      )
      .digest("hex");

    const vente = await tx.vente.create({
      data: {
        numeroTicket,
        vendeurId,
        date: now,
        totalHT,
        totalTVA,
        totalTTC,
        statut: "FINALISEE",
        hash,
        hashPrecedent,
        ...(options?.pointDeVenteId && {
          pointDeVenteId: options.pointDeVenteId,
        }),
        ...(options?.clientId && { clientId: options.clientId }),
        lignes: { create: lignesComputed.map((l) => ({ ...l })) },
        paiements: {
          create: paiements.map((p) => ({
            mode: p.mode,
            montant: p.montant,
            renduMonnaie: p.renduMonnaie ?? 0,
            ...(p.reference ? { reference: p.reference } : {}),
          })),
        },
      },
      include: {
        vendeur: { select: { id: true, nom: true, prenom: true } },
        lignes: {
          include: {
            variante: {
              include: { produit: { select: { id: true, nom: true } } },
            },
          },
        },
        paiements: true,
      },
    });

    // Decrement stock for each ligne
    await Promise.all(
      lignesComputed.map(async (l) => {
        const v = await tx.varianteProduit.findUnique({
          where: { id: l.varianteProduitId },
          select: { stockActuel: true },
        });
        if (!v) return;
        const newStock =
          Math.round((Number(v.stockActuel) - l.qte) * 1000) / 1000;
        await tx.varianteProduit.update({
          where: { id: l.varianteProduitId },
          data: { stockActuel: newStock },
        });
        await tx.mouvementStock.create({
          data: {
            varianteId: l.varianteProduitId,
            type: "VENTE",
            quantite: l.qte,
            venteId: vente.id,
            userId: vendeurId,
          },
        });
      }),
    );

    return vente;
  });
}
