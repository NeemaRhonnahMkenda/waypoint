"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchShared } from "@/lib/shareClient";
import { Icon } from "./icons";
import { findByShareId, getLocalTrip, patchLocal, putLocalTrip } from "@/lib/store";

/**
 * /t/<shareId>[#k=<editKey>]
 * Saves (or refreshes) a local copy linked to the shared trip, then opens it.
 * The edit key is read from the fragment and kept only in this browser.
 */
export default function OpenShared() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    const m = /[#&]k=([0-9A-Za-z]{32})/.exec(window.location.hash);
    const editKey = m?.[1];
    // Drop the key from the address bar/history straight away.
    if (window.location.hash) history.replaceState(null, "", window.location.pathname);

    (async () => {
      try {
        const existing = findByShareId(id);
        if (existing) {
          if (editKey && !existing.share?.editKey) patchLocal(existing.trip.id, { share: { ...existing.share!, editKey } });
          router.replace(`/trips/${existing.trip.id}`);
          return;
        }
        const r = await fetchShared(id);
        if (!alive || r.unchanged) return;
        const localId = getLocalTrip(r.trip.id) ? `${r.trip.id}-${id.slice(0, 4)}` : r.trip.id;
        putLocalTrip({
          trip: { ...r.trip, id: localId },
          share: { id, editKey, version: r.version, syncedAt: new Date().toISOString() },
        });
        router.replace(`/trips/${localId}`);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "Couldn't open this trip");
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, router]);

  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      {err ? (
        <>
          <span className="grid size-16 place-items-center rounded-2xl bg-sun-soft text-[#8a5a00]">
            <Icon.Compass className="size-8" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold">We couldn&apos;t open that trip</h1>
          <p className="mt-2 text-muted">{err}</p>
          <Link href="/" className="mt-6 font-medium text-accent hover:underline">
            Go to Waypoint
          </Link>
        </>
      ) : (
        <>
          <div className="size-10 animate-spin rounded-full border-4 border-line border-t-accent" aria-hidden />
          <p className="mt-4 text-muted">Opening shared trip…</p>
        </>
      )}
    </div>
  );
}
