import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Serverer en ferdig HTML side fra mappen sider/.
 * Brukes for apper som er skrevet som rene HTML filer og flyttet inn hit.
 */
export async function side(filnavn: string) {
  const html = await readFile(path.join(process.cwd(), "sider", filnavn), "utf8");
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
