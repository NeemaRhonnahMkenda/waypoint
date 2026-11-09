import { NextResponse } from "next/server";
import {
  EDIT_KEY_RE,
  SHARE_ID_RE,
  error,
  handleUnavailable,
  loadShared,
  rateLimited,
  readTrip,
  saveShared,
} from "@/lib/shareServer";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/trips/:id  (?v=<version> returns 304-style {unchanged:true} when nothing is new) */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!SHARE_ID_RE.test(id)) return error(404, "Trip not found");
  try {
    if (await rateLimited(req, "read", 120)) return error(429, "Slow down a little");
    const doc = await loadShared(id);
    if (!doc) return error(404, "This shared trip doesn't exist or has expired");
    const known = Number(new URL(req.url).searchParams.get("v"));
    if (known && known === doc.v) return NextResponse.json({ unchanged: true, version: doc.v });
    // Never return the key hash.
    return NextResponse.json({ trip: doc.trip, version: doc.v, updatedAt: doc.at });
  } catch (e) {
    return handleUnavailable(e);
  }
}

/** PUT /api/trips/:id  header X-Edit-Key, body { trip, baseVersion } */
export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!SHARE_ID_RE.test(id)) return error(404, "Trip not found");
  const key = req.headers.get("x-edit-key") ?? "";
  if (!EDIT_KEY_RE.test(key)) return error(403, "This link can't edit the trip");
  try {
    if (await rateLimited(req, "write", 60)) return error(429, "Too many saves. Try again in a minute.");
    const body = await readTrip(req);
    if (body instanceof NextResponse) return body;
    if (body.baseVersion === undefined) return error(400, "baseVersion is required");

    const { code, version } = await saveShared(id, key, body.baseVersion, body.trip);
    if (code === 1) return NextResponse.json({ version });
    if (code === -1) return error(404, "This shared trip doesn't exist or has expired");
    if (code === -2) return error(403, "This link can't edit the trip");
    return NextResponse.json({ error: "Someone else saved first", version }, { status: 409 });
  } catch (e) {
    return handleUnavailable(e);
  }
}
