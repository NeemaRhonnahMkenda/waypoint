import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { Suspense } from "react";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });

export const waypointMetadata: Metadata = {
  title: { default: "Waypoint · Plan trips together", template: "%s · Waypoint" },
  description:
    "Plan trips with family and friends: itineraries, destinations, places to stay, shared budgets and printable plans.",
};

function Loading() {
  return (
    <div className="grid flex-1 place-items-center py-32" aria-busy="true">
      <div className="size-10 animate-spin rounded-full border-4 border-line border-t-accent" aria-label="Loading Waypoint" />
    </div>
  );
}

/**
 * Wraps every Waypoint page, standalone or embedded.
 * - `.wp` applies Waypoint's own light theme (styles/waypoint.css)
 * - Bricolage Grotesque as the display face
 * - Suspense: Waypoint keeps trips in the visitor's browser and uses "today",
 *   so it renders per visit rather than being baked in at build time.
 * The host must import styles/theme.css (Tailwind tokens) and styles/waypoint.css.
 */
export default function WaypointShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`wp ${bricolage.variable} flex min-h-full flex-1 flex-col`}>
      <Suspense fallback={<Loading />}>{children}</Suspense>
    </div>
  );
}
