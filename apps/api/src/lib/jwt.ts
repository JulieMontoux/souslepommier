import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.SIGNING_SECRET ?? "change-me-in-production",
);
const ISSUER = "souslepommier";
const MAX_AGE = parseInt(process.env.SESSION_MAX_AGE ?? "28800");

export type JwtPayload = {
  id: string;
  email: string;
  role: "GERANT" | "VENDEUR";
  nom: string;
  prenom: string;
};

export async function signJwt(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(SECRET);
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, { issuer: ISSUER });
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export { MAX_AGE };
