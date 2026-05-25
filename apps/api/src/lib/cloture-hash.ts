import { createHmac } from "crypto";

export function computeClotureHash(data: {
  numero: number;
  date: string;
  totalTTC: string;
  gerantId: string;
  hashPrecedent: string;
}): string {
  const secret = process.env.SIGNING_SECRET;
  if (!secret) throw new Error("SIGNING_SECRET manquant");
  return createHmac("sha256", secret)
    .update(JSON.stringify(data))
    .digest("hex");
}
