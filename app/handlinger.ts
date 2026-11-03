"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { kunder } from "@/lib/kunder";
import { COOKIE_LEVETID, cookieNavn, signer } from "@/lib/tilgang";

export type LoggInnStatus = { feil?: string } | undefined;

/**
 * Passordet avgjør hvem du er. Hver kunde har sitt eget passord,
 * så ett felt holder. Treff gir informasjonskapsel for den kunden.
 */
export async function loggInn(
  _forrige: LoggInnStatus,
  formData: FormData,
): Promise<LoggInnStatus> {
  const passord = String(formData.get("passord") ?? "").trim();
  const til = String(formData.get("til") ?? "");

  if (!passord) {
    return { feil: "Skriv inn passordet." };
  }

  const kunde = kunder.find((k) => {
    const riktig = process.env[k.passordNokkel];
    return Boolean(riktig) && riktig === passord;
  });

  if (!kunde) {
    return { feil: "Passordet stemmer ikke." };
  }

  const jar = await cookies();
  jar.set(cookieNavn(kunde.slug), await signer(kunde.slug), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_LEVETID,
  });

  const egenMappe =
    til === `/${kunde.slug}` || til.startsWith(`/${kunde.slug}/`);
  redirect(egenMappe ? til : `/${kunde.slug}`);
}
