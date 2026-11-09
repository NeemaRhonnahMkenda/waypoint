"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { decodeLinkOnly } from "../lib/shareClient";
import { cloneAsNew, putLocalTrip } from "../lib/store";
import { fmtRange, to } from "../lib/util";
import { AvatarStack, Button, Card } from "./ui";

/** /import#d=<compressed trip>: link-only sharing (no server involved). */
export default function ImportLink() {
  const router = useRouter();
  // Read the fragment on the client only (it never reaches the server).
  const hash = useSyncExternalStore(
    () => () => {},
    () => window.location.hash,
    () => null,
  );
  const trip = hash ? decodeLinkOnly(hash) : null;

  if (hash === null) return null;

  if (!trip) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">This trip link is incomplete</h1>
        <p className="mt-2 text-muted">It may have been cut off when it was copied. Ask for the link again, or for the trip file.</p>
        <Link href={to("/")} className="mt-6 font-medium text-accent hover:underline">
          Go to Waypoint
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-coral">Someone shared a trip with you</p>
      <Card className="mt-4 p-6">
        <h1 className="font-display text-2xl font-bold">{trip.name}</h1>
        <p className="text-muted">{fmtRange(trip.startDate, trip.endDate)}</p>
        <p className="mt-3 text-sm">
          {trip.destinations.filter((d) => d.status === "planned").map((d) => d.name).join(" · ") || "No destinations yet"}
        </p>
        <div className="mt-4">
          <AvatarStack members={trip.members} />
        </div>
        <p className="mt-5 text-sm text-muted">Saving creates your own copy on this device. Changes you make won&apos;t sync back to the sender.</p>
        <Button
          variant="primary"
          className="mt-5 w-full"
          onClick={() => {
            const lt = cloneAsNew(trip);
            putLocalTrip(lt);
            history.replaceState(null, "", window.location.pathname);
            router.replace(to(`/trips/${lt.trip.id}`));
          }}
        >
          Save to my trips
        </Button>
      </Card>
    </div>
  );
}
