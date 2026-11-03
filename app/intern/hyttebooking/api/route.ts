import { NextResponse } from "next/server";
import { harDatabase, par, redis } from "@/lib/redis";
import seed from "@/lib/apper/hyttebooking-seed.json";

export const dynamic = "force-dynamic";

const P = "skeikampen:";

type Seed = {
  bookings: { id: string }[];
  needs: { id: string }[];
  people: string[];
};

async function sikreSeed() {
  const fersk = await redis(["SET", P + "seeded", new Date().toISOString(), "NX"]);
  if (!fersk) return;
  const s = seed as Seed;
  const b = s.bookings.flatMap((x) => [x.id, JSON.stringify(x)]);
  const n = s.needs.flatMap((x) => [x.id, JSON.stringify(x)]);
  if (b.length) await redis(["HSET", P + "bookings", ...b]);
  if (n.length) await redis(["HSET", P + "needs", ...n]);
  if (s.people.length) await redis(["SADD", P + "people", ...s.people]);
}

async function tilstand() {
  const [b, n, p] = await Promise.all([
    redis(["HGETALL", P + "bookings"]),
    redis(["HGETALL", P + "needs"]),
    redis(["SMEMBERS", P + "people"]),
  ]);
  return {
    bookings: Object.values(par(b)),
    needs: Object.values(par(n)),
    people: ((p as string[]) || []).sort((x, y) => x.localeCompare(y, "nb")),
  };
}

const rens = (v: unknown, maks: number) => String(v ?? "").trim().slice(0, maks);
const erDato = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const nyId = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

class ApiFeil extends Error {
  status: number;
  constructor(melding: string, status: number) {
    super(melding);
    this.status = status;
  }
}

type Body = Record<string, unknown>;

async function handle(body: Body) {
  const action = body.action;
  if (action === "book") {
    const name = rens(body.name, 40);
    const start = body.start;
    const end = body.end;
    if (!name || !erDato(start) || !erDato(end) || (end as string) <= (start as string)) {
      throw new ApiFeil("Ugyldig booking", 400);
    }
    const b = {
      id: nyId("b-"),
      name,
      start,
      end,
      note: rens(body.note, 200),
      tentative: Boolean(body.tentative),
      source: "web",
      createdAt: new Date().toISOString(),
    };
    await redis(["HSET", P + "bookings", b.id, JSON.stringify(b)]);
    await redis(["SADD", P + "people", name]);
    return;
  }
  if (action === "confirm" || action === "delete") {
    const raw = (await redis(["HGET", P + "bookings", rens(body.id, 80)])) as string | null;
    if (!raw) throw new ApiFeil("Finnes ikke", 404);
    const b = JSON.parse(raw);
    if (action === "confirm") {
      b.tentative = false;
      await redis(["HSET", P + "bookings", b.id, JSON.stringify(b)]);
      return;
    }
    b.deletedAt = new Date().toISOString();
    await redis(["HSET", P + "trash", b.id, JSON.stringify(b)]);
    await redis(["HDEL", P + "bookings", b.id]);
    return;
  }
  if (action === "need-add") {
    const text = rens(body.text, 120);
    if (!text) throw new ApiFeil("Mangler tekst", 400);
    const n = {
      id: nyId("n-"),
      text,
      comment: rens(body.comment, 200),
      done: false,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    await redis(["HSET", P + "needs", n.id, JSON.stringify(n)]);
    return;
  }
  if (action === "need-toggle" || action === "need-delete") {
    const id = rens(body.id, 80);
    const raw = (await redis(["HGET", P + "needs", id])) as string | null;
    if (!raw) throw new ApiFeil("Finnes ikke", 404);
    if (action === "need-delete") {
      await redis(["HDEL", P + "needs", id]);
      return;
    }
    const n = JSON.parse(raw);
    n.done = Boolean(body.done);
    await redis(["HSET", P + "needs", id, JSON.stringify(n)]);
    return;
  }
  throw new ApiFeil("Ukjent handling", 400);
}

const ikkeCache = { "Cache-Control": "no-store" };

async function svar(body?: Body) {
  if (process.env.VERCEL && !harDatabase) {
    return NextResponse.json({ error: "Databasen er ikke koblet til" }, { status: 503, headers: ikkeCache });
  }
  try {
    await sikreSeed();
    if (body) await handle(body);
    return NextResponse.json(await tilstand(), { headers: ikkeCache });
  } catch (e) {
    const feil = e instanceof ApiFeil ? e : new ApiFeil("Feil", 500);
    return NextResponse.json({ error: feil.message }, { status: feil.status, headers: ikkeCache });
  }
}

export function GET() {
  return svar();
}

export async function POST(request: Request) {
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }
  return svar(body);
}
