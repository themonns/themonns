import { readFile } from "node:fs/promises";
import path from "node:path";

const html = (tekst: string) =>
  new Response(tekst, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

/**
 * Serverer en ferdig HTML side fra mappen sider/.
 * Brukes for apper som er skrevet som rene HTML filer og flyttet inn hit.
 */
export async function side(filnavn: string) {
  return html(await readFile(path.join(process.cwd(), "sider", filnavn), "utf8"));
}

/**
 * Serverer index.html fra en mappe i public/. Brukes der et statisk nettsted
 * ligger med egne relative stier, slik at /kunde/prosjekt/ viser mappens forside.
 */
export async function statiskForside(mappe: string) {
  return html(await readFile(path.join(process.cwd(), "public", mappe, "_index.html"), "utf8"));
}
