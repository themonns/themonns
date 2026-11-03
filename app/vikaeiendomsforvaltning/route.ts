import { statiskForside } from "@/lib/side";

export const dynamic = "force-dynamic";

/** Vikas forside med alle eiendommene, laget som egen side. */
export function GET() {
  return statiskForside("vikaeiendomsforvaltning");
}
