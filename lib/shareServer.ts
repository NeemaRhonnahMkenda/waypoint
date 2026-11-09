import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { redis, RedisUnavailable } from "./redis";
import { MAX_TRIP_BYTES, TripSchema, type Trip } from "./types";

/* ------------------------------------------------------------------ */
/*  Shared-trip storage.                                               */
/*                                                                     */
/*  Key  wp:trip:<shareId>  ->  Redis hash { v, h, d }                 */
/*    v  version (increments on every save, used for conflict checks)  */
/*    h  SHA-256 of the edit key (the key itself is never stored)      */
/*    d  JSON { trip, at } (opaque to Lua, so arrays stay arrays)      */
/*                                                                     */
/*  Capability model, no accounts:                                     */
/*    view link  /t/<shareId>              anyone with it can read     */
/*    edit link  /t/<shareId>#k=<editKey>  needed to write             */
/*  The key lives in the URL fragment, so it never reaches server logs */
/*  or Referer headers; the client sends it in a header on writes.     */
/* ------------------------------------------------------------------ */

export const TTL_SECONDS = 60 * 60 * 24 * 180; // shared trips expire 6 months after last edit
const tripKey = (id: string) => `wp:trip:${id}`;

export const SHARE_ID_RE = /^[0-9A-Za-z]{12}$/;
export const EDIT_KEY_RE = /^[0-9A-Za-z]{32}$/;

export type Stored = { v: number; h: string; trip: Trip; at: string };

export function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export async function loadShared(id: string): Promise<Stored | null> {
  const flat = await redis<string[] | null>("HGETALL", tripKey(id));
  if (!flat || flat.length === 0) return null;
  const h: Record<string, string> = {};
  for (let i = 0; i < flat.length; i += 2) h[flat[i]] = flat[i + 1];
  if (!h.d) return null;
  const d = JSON.parse(h.d) as { trip: Trip; at: string };
  return { v: Number(h.v), h: h.h, trip: d.trip, at: d.at };
}

/** Atomic create; refuses to overwrite an existing id. */
const CREATE = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
redis.call('HSET', KEYS[1], 'v', 1, 'h', ARGV[1], 'd', ARGV[2])
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[3]))
return 1
`;

export async function createShared(id: string, editKey: string, trip: Trip): Promise<boolean> {
  const d = JSON.stringify({ trip, at: new Date().toISOString() });
  const ok = await redis<number>("EVAL", CREATE, 1, tripKey(id), hashKey(editKey), d, TTL_SECONDS);
  return ok === 1;
}

/**
 * Atomic compare-and-set in one Lua script: checks the edit-key hash and
 * the expected version server-side, so two people saving at once can never
 * silently overwrite each other.
 * Returns: [1, newVersion] ok | [-1] missing | [-2] bad key | [-3, currentVersion] conflict
 */
const CAS = `
local h = redis.call('HGET', KEYS[1], 'h')
if not h then return {-1} end
if h ~= ARGV[1] then return {-2} end
local v = tonumber(redis.call('HGET', KEYS[1], 'v'))
if v ~= tonumber(ARGV[2]) then return {-3, v} end
redis.call('HSET', KEYS[1], 'd', ARGV[3], 'v', v + 1)
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[4]))
return {1, v + 1}
`;

export async function saveShared(id: string, editKey: string, baseVersion: number, trip: Trip) {
  const body = JSON.stringify({ trip, at: new Date().toISOString() });
  const [code, version] = await redis<number[]>(
    "EVAL", CAS, 1, tripKey(id), hashKey(editKey), baseVersion, body, TTL_SECONDS,
  );
  return { code, version };
}

/** Fixed-window rate limit per client IP. Fails open if Redis hiccups. */
export async function rateLimited(req: Request, bucket: string, limit: number, windowSec = 60) {
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const key = `wp:rl:${bucket}:${hashKey(ip).slice(0, 16)}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  try {
    const n = await redis<number>(
      "EVAL",
      "local n = redis.call('INCR', KEYS[1]) if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end return n",
      1, key, windowSec,
    );
    return n > limit;
  } catch {
    return false;
  }
}

/** Read a JSON body with a hard size cap, then validate the trip inside it. */
export async function readTrip(req: Request): Promise<{ trip: Trip; baseVersion?: number } | NextResponse> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_TRIP_BYTES) return error(413, "Trip is too large to share");
  const text = await req.text();
  if (text.length > MAX_TRIP_BYTES) return error(413, "Trip is too large to share");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return error(400, "Invalid JSON");
  }
  const b = body as { trip?: unknown; baseVersion?: unknown };
  const parsed = TripSchema.safeParse(b.trip);
  if (!parsed.success) return error(400, "Trip data is invalid", parsed.error.issues.slice(0, 5));
  const baseVersion = typeof b.baseVersion === "number" ? b.baseVersion : undefined;
  return { trip: parsed.data, baseVersion };
}

export function error(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
}

export function handleUnavailable(e: unknown) {
  if (e instanceof RedisUnavailable) return error(503, "Group sharing is not available right now");
  console.error(e);
  return error(500, "Something went wrong");
}
