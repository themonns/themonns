import { side } from "@/lib/side";

export const dynamic = "force-dynamic";

export function GET() {
  return side("thon-osloairport.html");
}
