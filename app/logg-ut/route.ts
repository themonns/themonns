import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { finnKunde, kunder } from "@/lib/kunder";
import { cookieNavn } from "@/lib/tilgang";

/** /logg-ut?kunde=thon fjerner tilgangen for den kunden. Uten kunde fjernes alle. */
export function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("kunde");
  const svar = NextResponse.redirect(new URL("/", request.url));
  const hvilke = slug && finnKunde(slug) ? [finnKunde(slug)!] : kunder;
  for (const k of hvilke) {
    svar.cookies.set(cookieNavn(k.slug), "", { path: "/", maxAge: 0 });
  }
  return svar;
}
