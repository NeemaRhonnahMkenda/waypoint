import { NextResponse } from "next/server";
import { sharingEnabled } from "@/lib/redis";

export const dynamic = "force-dynamic";

/** Lets the UI choose between live group sharing and link-only sharing. */
export function GET() {
  return NextResponse.json({ sharing: sharingEnabled() });
}
