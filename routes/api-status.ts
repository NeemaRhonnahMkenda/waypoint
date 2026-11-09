import { connection, NextResponse } from "next/server";
import { sharingEnabled } from "../lib/redis";

/** Lets the UI choose between live group sharing and link-only sharing. */
export async function GET() {
  await connection(); // evaluate per request, never baked in at build time
  return NextResponse.json({ sharing: sharingEnabled() });
}
