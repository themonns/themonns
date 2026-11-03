import { statiskForside } from "@/lib/side";

export const dynamic = "force-dynamic";

export function GET() {
  return statiskForside("thon/resepsjon");
}
