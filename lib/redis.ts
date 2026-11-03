/**
 * Felles lagring for alle apper på themonns.no: Upstash Redis via Vercel Marketplace.
 * Koble én database til prosjektet, så settes KV_REST_API_URL og KV_REST_API_TOKEN selv.
 * Hver app bruker sitt eget prefiks på nøklene (skeikampen:, thon:), så de går ikke i veien for hverandre.
 * Uten database lokalt brukes et minnelager, så alt kan prøves uten oppsett.
 */

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const harDatabase = Boolean(URL_ && TOKEN);

type Cmd = (string | number)[];

type Minne = {
  h: Record<string, Record<string, string>>;
  s: Record<string, Set<string>>;
  k: Record<string, string>;
  l: Record<string, string[]>;
};

const g = globalThis as unknown as { __themonnsMinne?: Minne };
const minne: Minne = g.__themonnsMinne || (g.__themonnsMinne = { h: {}, s: {}, k: {}, l: {} });

function iMinne(cmd: Cmd): unknown {
  const [c0, key0, ...a] = cmd;
  const c = String(c0).toUpperCase();
  const key = String(key0);
  const h = (minne.h[key] = minne.h[key] || {});
  const s = (minne.s[key] = minne.s[key] || new Set());
  const l = (minne.l[key] = minne.l[key] || []);
  switch (c) {
    case "HGETALL":
      return Object.entries(h).flat();
    case "HGET":
      return h[String(a[0])] ?? null;
    case "HSET":
      for (let i = 0; i < a.length; i += 2) h[String(a[i])] = String(a[i + 1]);
      return 1;
    case "HDEL":
      return delete h[String(a[0])] ? 1 : 0;
    case "SMEMBERS":
      return [...s];
    case "SADD":
      a.forEach((x) => s.add(String(x)));
      return 1;
    case "SET":
      if (a.map(String).includes("NX") && key in minne.k) return null;
      minne.k[key] = String(a[0]);
      return "OK";
    case "RPUSH":
      a.forEach((x) => l.push(String(x)));
      return l.length;
    default:
      throw new Error("Ukjent kommando " + c);
  }
}

export async function redis(cmd: Cmd): Promise<unknown> {
  if (!harDatabase) return iMinne(cmd);
  const r = await fetch(URL_!, {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const j = (await r.json()) as { result?: unknown; error?: string };
  if (!r.ok || j.error) throw new Error(j.error || "redis " + r.status);
  return j.result;
}

/** Gjør en flat [felt, verdi, felt, verdi] liste om til et objekt med JSON-parsede verdier. */
export function par(arr: unknown): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  const a = (arr as string[]) || [];
  for (let i = 0; i < a.length; i += 2) {
    try {
      o[a[i]] = JSON.parse(a[i + 1]);
    } catch {
      /* hopper over ugyldig verdi */
    }
  }
  return o;
}
