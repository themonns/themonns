import { side } from "@/lib/side";

export const dynamic = "force-dynamic";

export function GET() {
  return side("intern-hyttebooking.html");
}
