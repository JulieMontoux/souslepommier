import { prisma } from "./prisma.js";
import { parisDayBounds } from "./paris-tz.js";
import { computeClotureApercu } from "./compute-cloture.js";
import { computeClotureHash } from "./cloture-hash.js";
import { logAudit } from "./audit.js";
import type { Prisma } from "@souslepommier/database";

async function runAutoCloture(dayDate: Date): Promise<void> {
  const [start, end] = parisDayBounds(dayDate);

  const existing = await prisma.clotureCaisse.findFirst({
    where: { date: { gte: start, lte: end } },
  });
  if (existing) return;

  const ventesCount = await prisma.vente.count({
    where: { date: { gte: start, lte: end }, statut: "FINALISEE" },
  });
  if (ventesCount === 0) return;

  const gerant = await prisma.user.findFirst({
    where: { role: "GERANT", actif: true },
    orderBy: { createdAt: "asc" },
  });
  if (!gerant) {
    console.warn("[auto-clôture] Aucun gérant actif — clôture ignorée");
    return;
  }

  const now = new Date();
  const apercu = await computeClotureApercu(prisma, dayDate);

  const cloture = await prisma.$transaction(
    async (tx) => {
      const last = await tx.clotureCaisse.findFirst({
        orderBy: { numeroCloture: "desc" },
        select: { numeroCloture: true, hashCumulatif: true },
      });
      const numeroCloture = (last?.numeroCloture ?? 0) + 1;
      const hashPrecedent = last?.hashCumulatif ?? "";

      const hash = computeClotureHash({
        numero: numeroCloture,
        date: now.toISOString(),
        totalTTC: apercu.totalTTC.toFixed(4),
        gerantId: gerant.id,
        hashPrecedent,
      });

      return tx.clotureCaisse.create({
        data: {
          numeroCloture,
          date: dayDate,
          gerantId: gerant.id,
          nbVentes: apercu.nbVentes,
          totalEspeces: apercu.totalEspeces,
          totalCB: apercu.totalCB,
          totalCheque: apercu.totalCheque,
          totalVirement: apercu.totalVirement,
          totalTR: apercu.totalTR,
          totalVentes: apercu.totalTTC,
          totalHT: apercu.totalHT,
          totalTVA: apercu.totalTVA,
          totalTTC: apercu.totalTTC,
          recapVendeurs: apercu.recapVendeurs as Prisma.InputJsonValue,
          recapTVA: apercu.recapTVA as Prisma.InputJsonValue,
          recapProduits: apercu.recapProduits as Prisma.InputJsonValue,
          ventesAnnulees: apercu.ventesAnnulees as Prisma.InputJsonValue,
          hashCumulatif: hash,
        },
      });
    },
    { isolationLevel: "Serializable" },
  );

  await logAudit({
    userId: gerant.id,
    action: "CLOTURE_CAISSE",
    entite: "ClotureCaisse",
    entiteId: cloture.id,
    nouvelleValeur: {
      numeroCloture: cloture.numeroCloture,
      totalTTC: Number(cloture.totalTTC),
      nbVentes: cloture.nbVentes,
      auto: true,
    },
  });

  console.log(
    `[auto-clôture] Clôture Z-${String(cloture.numeroCloture).padStart(4, "0")} créée automatiquement`,
  );
}

function scheduleNextAutoClose(): void {
  const now = new Date();
  const [, todayEnd] = parisDayBounds(now);
  const msUntilMidnight = todayEnd.getTime() - now.getTime() + 1;

  setTimeout(async () => {
    // dayDate = 1 second before midnight = the day that just ended
    const dayDate = new Date(Date.now() - 1000);
    try {
      await runAutoCloture(dayDate);
    } catch (err) {
      console.error("[auto-clôture] Erreur:", err);
    }
    scheduleNextAutoClose();
  }, msUntilMidnight);

  const hoursLeft = Math.round(msUntilMidnight / 3_600_000 * 10) / 10;
  console.log(`[auto-clôture] Prochaine clôture auto dans ${hoursLeft}h`);
}

// On startup: close yesterday if it has unclosed sales
async function closeYesterdayIfNeeded(): Promise<void> {
  const yesterday = new Date(Date.now() - 24 * 3_600_000);
  try {
    await runAutoCloture(yesterday);
  } catch (err) {
    console.error("[auto-clôture] Erreur init:", err);
  }
}

export async function initAutoClose(): Promise<void> {
  await closeYesterdayIfNeeded();
  scheduleNextAutoClose();
}
