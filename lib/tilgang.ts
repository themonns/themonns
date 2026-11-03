/**
 * Tilgang med én informasjonskapsel per kunde.
 * Verdien er en signatur av kundens slug, laget med TILGANG_HEMMELIGHET.
 * Ingen database, ingen sesjonslagring. Bytter du hemmeligheten, logges alle ut.
 */

const DEV_HEMMELIGHET = "bytt-meg-i-vercel";

export function cookieNavn(kundeSlug: string) {
  return `themonns_${kundeSlug}`;
}

function hemmelighet() {
  return process.env.TILGANG_HEMMELIGHET || DEV_HEMMELIGHET;
}

export async function signer(kundeSlug: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(hemmelighet()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(kundeSlug));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function erGyldig(kundeSlug: string, verdi: string | undefined) {
  if (!verdi) return false;
  const riktig = await signer(kundeSlug);
  if (riktig.length !== verdi.length) return false;
  let diff = 0;
  for (let i = 0; i < riktig.length; i++) {
    diff |= riktig.charCodeAt(i) ^ verdi.charCodeAt(i);
  }
  return diff === 0;
}

/** Ett år, i sekunder. */
export const COOKIE_LEVETID = 60 * 60 * 24 * 365;
