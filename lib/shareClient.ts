"use client";

import { useCallback, useEffect, useState } from "react";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { getLocalTrip, patchLocal, putLocalTrip } from "./store";
import { TripSchema, type LocalTrip, type Trip } from "./types";
import { BASE_PATH } from "./util";

/* ------------------------------------------------------------------ */
/*  Client side of sharing: publish, push, pull, links, link-only.     */
/* ------------------------------------------------------------------ */

const api = (p: string) => `${BASE_PATH}/api${p}`;

let statusPromise: Promise<boolean> | null = null;
/** Is live group sharing (Redis) configured on this deployment? */
export function sharingAvailable(): Promise<boolean> {
  statusPromise ??= fetch(api("/status"))
    .then((r) => (r.ok ? r.json() : { sharing: false }))
    .then((j: { sharing?: boolean }) => Boolean(j.sharing))
    .catch(() => false);
  return statusPromise;
}

export function useSharingAvailable() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    sharingAvailable().then((v) => alive && setOk(v));
    return () => {
      alive = false;
    };
  }, []);
  return ok;
}

async function json<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok && res.status !== 409) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body;
}

export async function publishTrip(localId: string) {
  const lt = getLocalTrip(localId);
  if (!lt) throw new Error("Trip not found");
  const res = await fetch(api("/trips"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trip: lt.trip }),
  });
  const r = await json<{ id: string; editKey: string; version: number }>(res);
  patchLocal(localId, { share: { id: r.id, editKey: r.editKey, version: r.version, syncedAt: new Date().toISOString() }, dirty: false });
}

export async function fetchShared(shareId: string, knownVersion?: number) {
  const q = knownVersion ? `?v=${knownVersion}` : "";
  const res = await fetch(api(`/trips/${encodeURIComponent(shareId)}${q}`), { cache: "no-store" });
  const r = await json<{ trip?: Trip; version: number; unchanged?: boolean }>(res);
  if (r.unchanged || !r.trip) return { unchanged: true as const, version: r.version };
  const parsed = TripSchema.safeParse(r.trip);
  if (!parsed.success) throw new Error("The shared trip data is invalid");
  return { unchanged: false as const, version: r.version, trip: parsed.data };
}

/* ---------- links ---------- */

function origin() {
  return typeof window === "undefined" ? "" : window.location.origin;
}

export function shareLinks(share: NonNullable<LocalTrip["share"]>) {
  const view = `${origin()}${BASE_PATH}/t/${share.id}`;
  return { view, edit: share.editKey ? `${view}#k=${share.editKey}` : null };
}

/** Link-only sharing: the whole trip, compressed into the URL fragment (never sent to a server). */
export function linkOnlyUrl(trip: Trip) {
  return `${origin()}${BASE_PATH}/import#d=${compressToEncodedURIComponent(JSON.stringify(trip))}`;
}

export function decodeLinkOnly(hash: string): Trip | null {
  const m = /[#&]d=([^&]+)/.exec(hash);
  if (!m) return null;
  try {
    const raw = decompressFromEncodedURIComponent(m[1]);
    if (!raw || raw.length > 512 * 1024) return null;
    const parsed = TripSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function downloadTrip(trip: Trip) {
  const blob = new Blob([JSON.stringify(trip, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${trip.name.replace(/[^\w-]+/g, "-").toLowerCase() || "trip"}.waypoint.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function readTripFile(file: File): Promise<Trip> {
  if (file.size > 512 * 1024) throw new Error("File is too large");
  const parsed = TripSchema.safeParse(JSON.parse(await file.text()));
  if (!parsed.success) throw new Error("This isn't a valid Waypoint trip file");
  return parsed.data;
}

/* ------------------------------------------------------------------ */
/*  Sync engine: pushes local edits (debounced) and pulls group edits. */
/* ------------------------------------------------------------------ */

export type SyncState = "local" | "view" | "synced" | "pending" | "saving" | "conflict" | "offline";

export function useTripSync(lt: LocalTrip | null | undefined) {
  const id = lt?.trip.id;
  const share = lt?.share;
  const canEdit = Boolean(share?.editKey);
  const dirty = Boolean(lt?.dirty);
  const updatedAt = lt?.trip.updatedAt;

  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);
  const [conflict, setConflict] = useState<number | null>(null); // server version we clashed with

  const push = useCallback(async () => {
    if (!id) return;
    const cur = getLocalTrip(id);
    if (!cur?.share?.editKey || !cur.dirty) return;
    const sentAt = cur.trip.updatedAt;
    setSaving(true);
    try {
      const res = await fetch(api(`/trips/${cur.share.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Edit-Key": cur.share.editKey },
        body: JSON.stringify({ trip: cur.trip, baseVersion: cur.share.version }),
      });
      const r = await json<{ version: number; error?: string }>(res);
      if (res.status === 409) {
        setConflict(r.version);
        return;
      }
      const latest = getLocalTrip(id);
      if (!latest?.share) return;
      patchLocal(id, {
        share: { ...latest.share, version: r.version, syncedAt: new Date().toISOString() },
        dirty: latest.trip.updatedAt !== sentAt, // edited while saving: push again
      });
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setSaving(false);
    }
  }, [id]);

  const pull = useCallback(async () => {
    if (!id) return;
    const cur = getLocalTrip(id);
    if (!cur?.share || cur.dirty) return;
    try {
      const r = await fetchShared(cur.share.id, cur.share.version);
      setOffline(false);
      if (r.unchanged) return;
      const latest = getLocalTrip(id);
      if (!latest?.share || latest.dirty) return; // user started editing meanwhile
      putLocalTrip({
        ...latest,
        trip: { ...r.trip, id }, // keep local id stable
        share: { ...latest.share, version: r.version, syncedAt: new Date().toISOString() },
        dirty: false,
      });
    } catch {
      setOffline(true);
    }
  }, [id]);

  // Push edits 1.2s after the last change.
  useEffect(() => {
    if (!canEdit || !dirty || conflict !== null) return;
    const t = setTimeout(push, 1200);
    return () => clearTimeout(t);
  }, [canEdit, dirty, updatedAt, conflict, push]);

  // Pull group changes every 20s and whenever the tab regains focus.
  useEffect(() => {
    if (!share?.id) return;
    const first = setTimeout(pull, 300);
    const t = setInterval(pull, 20_000);
    const onFocus = () => pull();
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(first);
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [share?.id, pull]);

  const resolve = useCallback(
    async (choice: "mine" | "theirs") => {
      if (!id) return;
      const cur = getLocalTrip(id);
      if (!cur?.share) return;
      const r = await fetchShared(cur.share.id);
      if (r.unchanged) return;
      if (choice === "theirs") {
        putLocalTrip({ ...cur, trip: { ...r.trip, id }, share: { ...cur.share, version: r.version }, dirty: false });
      } else {
        // Rebase onto the latest version, then the push effect overwrites it with ours.
        patchLocal(id, { share: { ...cur.share, version: r.version }, dirty: true });
      }
      setConflict(null);
    },
    [id],
  );

  let state: SyncState = "local";
  if (share && !canEdit) state = "view";
  else if (share) {
    if (conflict !== null) state = "conflict";
    else if (saving) state = "saving";
    else if (offline) state = "offline";
    else if (dirty) state = "pending";
    else state = "synced";
  }
  return { state, resolve, retry: push };
}
