"use client";

import { useState } from "react";
import { currenciesUsed, summarise, useRates } from "../../lib/money";
import { updateTrip } from "../../lib/store";
import type { LocalTrip } from "../../lib/types";
import { cx, daysBetween, eachDay, fmtDate, fmtMoney, todayIso } from "../../lib/util";
import { Icon } from "../icons";
import TripMap from "../TripMap";
import { Avatar, Button, Card, CatIcon, Pill, useReadOnly } from "../ui";
import type { TabId } from "./Workspace";

export default function Overview({ lt, go }: { lt: LocalTrip; go: (t: TabId) => void }) {
  const { trip } = lt;
  const ro = useReadOnly();
  const rates = useRates(trip.currency, currenciesUsed(trip).length > 0);
  const sum = summarise(trip, rates);

  const days = eachDay(trip.startDate, trip.endDate);
  const today = todayIso();
  const untilStart = daysBetween(today, trip.startDate);
  const planned = trip.destinations.filter((d) => d.status === "planned");
  const booked = trip.stays.filter((s) => s.status === "booked").length;
  const pct = trip.budget.total ? Math.round((sum.spentTotal / trip.budget.total) * 100) : null;

  const focusDay = today >= trip.startDate && today <= trip.endDate ? today : trip.startDate;
  const focusActs = trip.activities.filter((a) => a.date === focusDay).sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));

  const ideas = [
    ...trip.destinations.filter((d) => d.status === "idea").map((d) => ({ id: d.id, kind: "Place", name: d.name, votes: d.votes })),
    ...trip.stays.filter((s) => s.status === "idea").map((s) => ({ id: s.id, kind: "Stay", name: s.name, votes: s.votes })),
  ].sort((a, b) => b.votes.length - a.votes.length);
  const memberName = (id: string) => trip.members.find((m) => m.id === id)?.name ?? "";

  const headline =
    untilStart > 1 ? `${untilStart} sleeps to go` : untilStart === 1 ? "Tomorrow's the day" : today <= trip.endDate ? "You're on the trip" : "That was a good one";

  return (
    <div className="grid gap-5">
      {ro ? null : <Checklist lt={lt} go={go} />}

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        {/* Hero */}
        <Card className="relative flex flex-col overflow-hidden p-6 sm:p-8">
          <span className="absolute -top-16 -right-16 size-48 rounded-full bg-sun-soft" aria-hidden />
          <div className="relative">
            <Pill tone="sun" icon="Clock">
              {headline}
            </Pill>
            <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{trip.name}</h2>
            {planned.length ? (
              <ol className="mt-4 flex flex-wrap items-center gap-2" aria-label="Route">
                {planned.map((d, i) => (
                  <li key={d.id} className="flex items-center gap-2">
                    {i ? <span className="h-0.5 w-4 rounded bg-line" aria-hidden /> : null}
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft py-1 pr-3 pl-1 text-sm font-semibold text-accent">
                      <span className="grid size-6 place-items-center rounded-full bg-accent text-xs text-accent-ink">{i + 1}</span>
                      {d.name}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-muted">No stops on the route yet.</p>
            )}
          </div>

          <dl className="relative mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: "Days", v: days.length || "–" },
              { k: "Stops", v: planned.length },
              { k: "Stays booked", v: `${booked}/${trip.stays.length}` },
              { k: "Budget used", v: pct === null ? "–" : `${pct}%` },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl bg-paper px-4 py-3">
                <dt className="text-xs font-medium text-muted">{s.k}</dt>
                <dd className="mt-0.5 font-display text-2xl font-bold">{s.v}</dd>
              </div>
            ))}
          </dl>

          <div className="relative mt-6 flex flex-wrap items-center gap-3">
            <div className="flex -space-x-2">
              {trip.members.map((m) => (
                <Avatar key={m.id} m={m} />
              ))}
            </div>
            <p className="text-sm text-muted">
              {trip.members.length} traveller{trip.members.length === 1 ? "" : "s"}
              {trip.families.length ? ` · ${trip.families.length} famil${trip.families.length === 1 ? "y" : "ies"}` : ""}
            </p>
            <Button size="sm" variant="ghost" onClick={() => go("group")}>
              Manage group
            </Button>
          </div>
        </Card>

        <TripMap destinations={trip.destinations} className="h-72 lg:h-auto lg:min-h-80" />

        {/* Day focus */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-bold">
              {focusDay === today ? "Today" : "Day 1"}{" "}
              <span className="font-normal text-muted">{fmtDate(focusDay, { weekday: "short", day: "numeric", month: "short" })}</span>
            </h3>
            <Button size="sm" variant="ghost" onClick={() => go("itinerary")}>
              See all days
            </Button>
          </div>
          {focusActs.length ? (
            <ol className="space-y-3">
              {focusActs.map((a) => (
                <li key={a.id} className="flex items-center gap-3">
                  <CatIcon c={a.category} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{a.title}</span>
                    {a.place ? <span className="block truncate text-sm text-muted">{a.place}</span> : null}
                  </span>
                  <span className="font-mono text-sm text-muted">{a.time || "Any time"}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">Nothing planned yet. A free day sounds nice too.</p>
          )}
        </Card>

        {/* Still deciding */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-bold">Still deciding</h3>
            <Button size="sm" variant="ghost" onClick={() => go("places")}>
              Go vote
            </Button>
          </div>
          {ideas.length ? (
            <ul className="space-y-3">
              {ideas.slice(0, 5).map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{i.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {i.kind}
                      {i.votes.length ? ` · ${i.votes.map(memberName).filter(Boolean).join(", ")}` : " · no votes yet"}
                    </span>
                  </span>
                  <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", i.votes.length ? "bg-coral-soft text-coral" : "bg-sunk text-muted")}>
                    <Icon.Heart className="size-3.5" filled={i.votes.length > 0} /> {i.votes.length}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No open questions. Add places or stays as ideas and the group can vote.</p>
          )}
        </Card>

        {/* Money snapshot */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted">Spent so far</p>
              <p className="font-display text-3xl font-extrabold">{fmtMoney(sum.spentTotal, trip.currency)}</p>
              {trip.budget.total ? <p className="text-sm text-muted">of {fmtMoney(trip.budget.total, trip.currency)} budget</p> : null}
            </div>
            <div>
              <p className="text-sm font-medium text-muted">Committed in plans</p>
              <p className="font-display text-xl font-bold">{fmtMoney(sum.plannedTotal, trip.currency)}</p>
            </div>
            <Button size="sm" icon="Wallet" onClick={() => go("budget")}>
              Open budget
            </Button>
          </div>
          {trip.budget.total ? (
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--chart-track)]" role="img" aria-label={`${pct}% of budget spent`}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, pct ?? 0)}%`, background: (pct ?? 0) > 100 ? "var(--critical)" : "var(--series-1)" }}
              />
            </div>
          ) : null}
        </Card>

        {/* Notes */}
        <Card className="p-6 lg:col-span-2">
          <label htmlFor="trip-notes" className="font-display text-lg font-bold">
            Notes for everyone
          </label>
          <textarea
            id="trip-notes"
            readOnly={ro}
            defaultValue={trip.notes}
            key={trip.notes}
            onBlur={(e) => e.target.value !== trip.notes && updateTrip(trip.id, (t) => (t.notes = e.target.value.slice(0, 2000)))}
            placeholder="Packing reminders, visa notes, meeting points…"
            rows={4}
            className="mt-3 w-full resize-y rounded-2xl border border-line bg-paper p-4 text-[15px] outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
        </Card>
      </div>
    </div>
  );
}

/** Five steps to a ready trip. Each one jumps straight to where it's done. Hides once complete. */
function Checklist({ lt, go }: { lt: LocalTrip; go: (t: TabId) => void }) {
  const { trip } = lt;
  const [hidden, setHidden] = useState(false);
  const steps: { done: boolean; title: string; body: string; tab: TabId }[] = [
    { done: trip.destinations.some((d) => d.status === "planned"), title: "Add where you're going", body: "Search a city and pick your days there.", tab: "places" },
    { done: trip.stays.length > 0, title: "Find somewhere to stay", body: "Paste a booking link. Everyone can vote.", tab: "places" },
    { done: trip.activities.length > 0, title: "Plan a day", body: "Add the first thing you're doing.", tab: "itinerary" },
    { done: trip.members.length > 1 || Boolean(lt.share), title: "Bring your people", body: "Add travellers or share the trip link.", tab: "group" },
    { done: trip.budget.total > 0, title: "Set a budget", body: "Even a rough number helps.", tab: "budget" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (hidden || doneCount === steps.length) return null;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-accent px-6 py-4 text-accent-ink">
        <div>
          <p className="font-display text-lg font-bold">Let&apos;s get this trip ready</p>
          <p className="text-sm opacity-85">
            {doneCount} of {steps.length} done
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-28 overflow-hidden rounded-full bg-white/25" aria-hidden>
            <div className="h-full rounded-full bg-sun" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
          </div>
          <button
            type="button"
            onClick={() => setHidden(true)}
            className="text-sm font-semibold underline-offset-4 hover:underline"
          >
            Hide
          </button>
        </div>
      </div>
      <ol className="grid divide-y divide-line sm:grid-cols-5 sm:divide-x sm:divide-y-0">
        {steps.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => go(s.tab)}
              className="flex h-full w-full items-start gap-3 p-4 text-left transition hover:bg-paper"
            >
              <span
                className={cx(
                  "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                  s.done ? "bg-accent text-accent-ink" : "border-2 border-line text-muted",
                )}
              >
                {s.done ? <Icon.Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span>
                <span className={cx("block text-sm font-semibold", s.done && "text-muted line-through")}>{s.title}</span>
                <span className="block text-xs text-muted">{s.body}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </Card>
  );
}
