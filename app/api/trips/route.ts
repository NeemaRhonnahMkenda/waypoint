import { NextResponse } from "next/server";
import { randomId } from "@/lib/util";
import { createShared, error, handleUnavailable, rateLimited, readTrip } from "@/lib/shareServer";

/** POST /api/trips: publish a trip for the group. Returns its share id and the edit key (shown once). */
export async function POST(req: Request) {
  try {
    if (await rateLimited(req, "create", 10)) return error(429, "Too many new shared trips. Try again in a minute.");
    const body = await readTrip(req);
    if (body instanceof NextResponse) return body;

    for (let attempt = 0; attempt < 3; attempt++) {
      const id = randomId(12);
      const editKey = randomId(32);
      if (await createShared(id, editKey, body.trip)) {
        return NextResponse.json({ id, editKey, version: 1 }, { status: 201 });
      }
    }
    return error(500, "Could not allocate a share id");
  } catch (e) {
    return handleUnavailable(e);
  }
}
