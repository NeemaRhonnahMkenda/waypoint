"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { cloneAsNew, putLocalTrip, sampleTrip, useTrips } from "../lib/store";
import { readTripFile } from "../lib/shareClient";
import { cx, daysBetween, fmtRange, HOME_URL, to, todayIso } from "../lib/util";
import { Icon, type IconName } from "./icons";
import NewTrip from "./NewTrip";
import { AvatarStack, Button, Pill } from "./ui";

function countdown(start: string, end: string) {
  const t = todayIso();
  if (!start) return null;
  if (t < start) {
    const n = daysBetween(t, start);
    return { text: n === 1 ? "Tomorrow!" : `In ${n} days`, tone: "sun" as const };
  }
  if (t <= end) return { text: "Happening now", tone: "coral" as const };
  return { text: "Memories", tone: "neutral" as const };
}

const FEATURES: { icon: IconName; tone: string; title: string; body: string }[] = [
  { icon: "Calendar", tone: "bg-accent-soft text-accent", title: "Day-by-day plans", body: "A schedule for every day, with the weather for wherever you'll be." },
  { icon: "Pin", tone: "bg-coral-soft text-coral", title: "Places & stays", body: "Map the route, save stay links and let everyone vote." },
  { icon: "Wallet", tone: "bg-sun-soft text-[#8a5a00]", title: "Fair shared budgets", body: "Any currency. See who owes whom, per person or per family." },
  { icon: "Printer", tone: "bg-sky-soft text-sky", title: "Print it", body: "A clean paper copy for the fridge or the glovebox." },
];

/** Little route doodle for the hero: dashed path, three stops and a plane. */
function RouteDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 260" className={className} aria-hidden>
      <circle cx="292" cy="58" r="34" fill="var(--sun-soft)" />
      <circle cx="292" cy="58" r="20" fill="var(--sun)" opacity=".9" />
      <path
        d="M40 210 C 90 120, 150 230, 190 150 S 270 90, 300 160"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeDasharray="2 10"
        strokeLinecap="round"
      />
      {[
        [40, 210, "var(--accent)"],
        [190, 150, "var(--coral)"],
        [300, 160, "var(--plum)"],
      ].map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path d="M0 0c-9-11-14-18-14-25a14 14 0 0 1 28 0c0 7-5 14-14 25Z" fill={c as string} />
          <circle cy="-25" r="5" fill="#fff" />
        </g>
      ))}
      <g transform="translate(118 78) rotate(-18)">
        <path d="M0 8 34 0l6 4-10 4 14 10-6 3-18-8-12 4z" fill="var(--ink)" />
      </g>
      <path d="M58 80c10-6 22-6 30 0M70 92c8-4 14-4 20 0" stroke="var(--muted)" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".5" />
    </svg>
  );
}

export default function Home() {
  const trips = useTrips();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const list = trips
    ? Object.values(trips).sort((a, b) => (a.trip.startDate || "9").localeCompare(b.trip.startDate || "9"))
    : [];

  function openSample() {
    const lt = sampleTrip();
    putLocalTrip(lt);
    router.push(to(`/trips/${lt.trip.id}`));
  }

  async function importFile(f: File | undefined) {
    if (!f) return;
    setErr("");
    try {
      const lt = cloneAsNew(await readTripFile(f));
      putLocalTrip(lt);
      router.push(to(`/trips/${lt.trip.id}`));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't import that file");
    }
  }

  return (
    <div className="paper-glow flex-1">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-8">
        <header className="flex h-18 items-center justify-between py-4">
          <Link href={to("/")} className="flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight">
            <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-ink">
              <Icon.Compass className="size-5" strokeWidth={2.2} />
            </span>
            Waypoint
          </Link>
          <div className="flex items-center gap-2">
            {/* When Waypoint is embedded in the portfolio, offer a way back. */}
            {HOME_URL ? (
              <Link
                href={HOME_URL}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-muted transition hover:bg-sunk hover:text-ink"
              >
                <Icon.ArrowLeft className="size-4" /> Portfolio
              </Link>
            ) : null}
            <Button size="sm" variant="primary" icon="Plus" onClick={() => setCreating(true)}>
              New trip
            </Button>
          </div>
        </header>

        <section className="grid items-center gap-6 py-10 sm:py-16 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <Pill tone="coral" icon="Sparkle">
              Trip planning for families & friends
            </Pill>
            <h1 className="mt-5 max-w-3xl font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
              Plan the trip{" "}
              <span className="relative whitespace-nowrap text-accent">
                together
                <svg viewBox="0 0 200 12" className="absolute -bottom-2 left-0 w-full" aria-hidden>
                  <path d="M2 9c40-6 120-8 196-3" stroke="var(--sun)" strokeWidth="5" fill="none" strokeLinecap="round" />
                </svg>
              </span>
              , not in the group chat.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              One shared plan for where you&apos;re going, where you&apos;re staying, what you&apos;re doing each day and who
              paid for what.
            </p>
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <Button variant="primary" icon="Plus" onClick={() => setCreating(true)}>
                Start a trip
              </Button>
              <Button variant="sun" icon="Sparkle" onClick={openSample}>
                Try the sample trip
              </Button>
              <Button variant="ghost" icon="Download" onClick={() => fileRef.current?.click()}>
                Import a trip file
              </Button>
              <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => importFile(e.target.files?.[0])} />
            </div>
            {err ? <p className="mt-3 text-sm text-[var(--critical)]">{err}</p> : null}
          </div>
          <RouteDoodle className="mx-auto hidden w-full max-w-sm lg:block" />
        </section>

        <section aria-labelledby="mytrips">
          <div className="mb-4 flex items-end justify-between">
            <h2 id="mytrips" className="font-display text-2xl font-bold tracking-tight">
              Your trips
            </h2>
            {list.length ? <span className="text-sm text-muted">Saved on this device</span> : null}
          </div>

          {trips === null ? (
            <div className="h-40 animate-pulse rounded-[1.75rem] bg-sunk" />
          ) : list.length === 0 ? (
            <div className="flex flex-col items-start gap-4 rounded-[1.75rem] border-2 border-dashed border-line bg-card/60 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="grid size-12 place-items-center rounded-2xl bg-sun-soft text-[#8a5a00]">
                  <Icon.Suitcase className="size-6" />
                </span>
                <div>
                  <p className="font-display text-lg font-bold">No trips yet</p>
                  <p className="text-sm text-muted">Start one, or poke around the sample first.</p>
                </div>
              </div>
              <Button icon="Plus" variant="primary" onClick={() => setCreating(true)}>
                Start a trip
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map(({ trip, share }, i) => {
                const cd = countdown(trip.startDate, trip.endDate);
                const planned = trip.destinations.filter((d) => d.status === "planned");
                const stripe = ["bg-accent", "bg-coral", "bg-sun", "bg-plum", "bg-sky"][i % 5];
                return (
                  <Link
                    key={trip.id}
                    href={to(`/trips/${trip.id}`)}
                    className="group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-line bg-card p-5 pt-6 transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <span className={cx("absolute inset-x-0 top-0 h-1.5", stripe)} aria-hidden />
                    <div className="flex items-center justify-between gap-2">
                      {cd ? <Pill tone={cd.tone}>{cd.text}</Pill> : <span />}
                      {share ? (
                        <Pill tone="sky" icon={share.editKey ? "Users" : "Eye"}>
                          {share.editKey ? "Shared" : "View only"}
                        </Pill>
                      ) : null}
                    </div>
                    <h3 className="mt-4 font-display text-xl font-bold leading-tight tracking-tight">{trip.name}</h3>
                    <p className="mt-1 text-sm text-muted">{fmtRange(trip.startDate, trip.endDate)}</p>
                    {planned.length ? (
                      <p className="mt-3 flex items-center gap-1.5 text-sm">
                        <Icon.Route className="size-4 shrink-0 text-accent" />
                        <span className="line-clamp-1">{planned.map((d) => d.name).join(" · ")}</span>
                      </p>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between pt-5">
                      <AvatarStack members={trip.members} />
                      <span className="grid size-9 place-items-center rounded-full bg-sunk text-ink transition group-hover:bg-accent group-hover:text-accent-ink">
                        <Icon.ArrowRight className="size-4" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => {
            const Ic = Icon[f.icon];
            return (
              <div key={f.title} className="rounded-[1.75rem] border border-line bg-card p-5">
                <span className={cx("grid size-11 place-items-center rounded-2xl", f.tone)}>
                  <Ic className="size-[22px]" />
                </span>
                <p className="mt-4 font-display font-bold">{f.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{f.body}</p>
              </div>
            );
          })}
        </section>

        <p className="mt-10 text-center text-xs text-muted">Trips are saved in this browser. Share a trip to plan it with your group.</p>
        <NewTrip open={creating} onClose={() => setCreating(false)} />
      </div>
    </div>
  );
}
