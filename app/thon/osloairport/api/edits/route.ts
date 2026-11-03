import { NextResponse } from "next/server";
import { harDatabase, par, redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

const KEY = "thon:edits";
const LOGG = "thon:logg";
const okId = (id: unknown): id is string =>
  typeof id === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(id);

const ikkeCache = { "Cache-Control": "no-store" };
const feil = (melding: string, status: number) =>
  NextResponse.json({ error: melding }, { status, headers: ikkeCache });

function utenDatabase() {
  if (process.env.VERCEL && !harDatabase) {
    return feil("Databasen er ikke koblet til i Vercel.", 500);
  }
  return null;
}

export async function GET() {
  const stopp = utenDatabase();
  if (stopp) return stopp;
  try {
    const flat = await redis(["HGETALL", KEY]);
    return NextResponse.json(par(flat), { headers: ikkeCache });
  } catch {
    return feil("Lagring feilet.", 500);
  }
}

export async function POST(request: Request) {
  const stopp = utenDatabase();
  if (stopp) return stopp;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      id?: unknown;
      data?: Record<string, unknown>;
    };
    const { id, data } = body;
    if (!okId(id) || !data || typeof data !== "object") return feil("bad", 400);
    const s = JSON.stringify(data);
    if (s.length > (data.t === "add" ? 150000 : 4000)) return feil("stor", 400);
    await redis(["HSET", KEY, id, s]);
    await redis(["RPUSH", LOGG, JSON.stringify({ op: "set", id, data, at: Date.now() })]);
    return NextResponse.json({ ok: true }, { headers: ikkeCache });
  } catch {
    return feil("Lagring feilet.", 500);
  }
}

export async function DELETE(request: Request) {
  const stopp = utenDatabase();
  if (stopp) return stopp;
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!okId(id)) return feil("bad", 400);
    await redis(["HDEL", KEY, id]);
    await redis(["RPUSH", LOGG, JSON.stringify({ op: "del", id, at: Date.now() })]);
    return NextResponse.json({ ok: true }, { headers: ikkeCache });
  } catch {
    return feil("Lagring feilet.", 500);
  }
}
