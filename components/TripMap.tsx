"use client";

import dynamic from "next/dynamic";
import type { Destination } from "@/lib/types";
import { cx } from "@/lib/util";

// Leaflet touches `window`, so it only ever loads in the browser.
const Inner = dynamic(() => import("./TripMapInner"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-sunk" />,
});

export default function TripMap({ destinations, className }: { destinations: Destination[]; className?: string }) {
  return (
    <div className={cx("relative isolate overflow-hidden rounded-3xl border border-line bg-sunk", className)}>
      {destinations.length ? (
        <Inner destinations={destinations} />
      ) : (
        <div className="grid size-full place-items-center p-6 text-center text-sm text-muted">
          Add destinations in Places to see your route here.
        </div>
      )}
    </div>
  );
}
