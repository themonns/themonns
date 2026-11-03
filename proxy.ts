import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { finnKunde } from "@/lib/kunder";
import { cookieNavn, erGyldig } from "@/lib/tilgang";

/**
 * Første mappe i adressen er kunden. Har ikke nettleseren gyldig
 * informasjonskapsel for den kunden, sendes den til forsiden for å
 * skrive passord, og tilbake hit etterpå.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const forsteMappe = pathname.split("/")[1];
  const kunde = finnKunde(forsteMappe);

  if (!kunde) {
    return NextResponse.next();
  }

  const verdi = request.cookies.get(cookieNavn(kunde.slug))?.value;
  if (await erGyldig(kunde.slug, verdi)) {
    return NextResponse.next();
  }

  const til = new URL("/", request.url);
  til.searchParams.set("til", pathname);
  return NextResponse.redirect(til);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts|robots.txt|logg-ut).*)"],
};
