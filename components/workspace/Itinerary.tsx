"use client";

import { useState } from "react";
import { destinationOn, useForecast } from "@/lib/places";
import type { Activity, LocalTrip, Trip } from "@/lib/types";
import { cx, eachDay, fmtDate, fmtMoney, hostOf, todayIso } from "@/lib/util";
import { Icon } from "../icons";
import { Button, Card, CatIcon, Empty, IconButton, Pill, SectionTitle, WeatherBadge, useReadOnly } from "../ui";
import ActivityModal from "./ActivityModal";

type Editing = { activity?: Activity; date?: string; key: number } | null;

export default function Itinerary({ lt }: { lt: LocalTrip }) {
  const { trip } = lt;
  const ro = useReadOnly();
  const [editing, setEditing] = useState<Editing>(null);
  const days = eachDay(trip.startDate, trip.endDate);
  const outside = trip.activities.filter((a) => !days.includes(a.date));
  const today = todayIso();

  if (!days.length) {
    return <Empty icon="Calendar" title="Set your trip dates" body="Add start and end dates in Group to build a day-by-day plan." />;
  }

  return (
    <div>
      <SectionTitle
        title="Day by day"
        sub={`${days.length} days · ${trip.activities.length} plan${trip.activities.length === 1 ? "" : "s"}`}
        action={
          ro ? null : (
            <Button variant="primary" icon="Plus" onClick={() => setEditing({ key: Date.now() })}>
              Add a plan
            </Button>
          )
        }
      />

      {/* Quick day jump */}
      <nav aria-label="Jump to day" className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {days.map((d, i) => {
          const n = trip.activities.filter((a) => a.date === d).length;
          return (
            <a
              key={d}
              href={`#day-${d}`}
              className={cx(
                "flex min-w-16 shrink-0 flex-col items-center rounded-2xl border px-3 py-2 text-center transition hover:border-accent",
                d === today ? "border-accent bg-accent-soft" : "border-line bg-card",
              )}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Day {i + 1}</span>
              <span className="font-display text-xl font-bold leading-tight">{fmtDate(d, { day: "numeric" })}</span>
              <span className="text-[11px] font-semibold text-muted">{fmtDate(d, { weekday: "short" })}</span>
              <span className="mt-1 flex gap-0.5" aria-label={`${n} plans`}>
                {Array.from({ length: Math.min(n, 4) }).map((_, j) => (
                  <span key={j} className="size-1.5 rounded-full bg-coral" />
                ))}
                {n === 0 ? <span className="size-1.5 rounded-full bg-line" /> : null}
              </span>
            </a>
          );
        })}
      </nav>

      <div className="grid gap-4">
        {days.map((d, i) => (
          <DayCard
            key={d}
            trip={trip}
            date={d}
            prev={i ? days[i - 1] : undefined}
            index={i}
            onAdd={() => setEditing({ date: d, key: Date.now() })}
            onEdit={(a) => setEditing({ activity: a, key: Date.now() })}
          />
        ))}
      </div>

      {outside.length ? (
        <Card className="mt-6 border-coral/40 p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold">
            <Icon.Alert className="size-5 text-coral" /> Plans outside your trip dates
          </h3>
          <p className="text-sm text-muted">Probably from a date change. Tap one to move it onto a trip day.</p>
          <ul className="mt-3 divide-y divide-line">
            {outside.map((a) => (
              <ActivityRow key={a.id} a={a} showDate onEdit={() => setEditing({ activity: a, key: Date.now() })} />
            ))}
          </ul>
        </Card>
      ) : null}

      {editing ? <ActivityModal key={editing.key} trip={trip} initial={editing.activity} date={editing.date} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function DayCard({
  trip,
  date,
  prev,
  index,
  onAdd,
  onEdit,
}: {
  trip: Trip;
  date: string;
  prev?: string;
  index: number;
  onAdd: () => void;
  onEdit: (a: Activity) => void;
}) {
  const ro = useReadOnly();
  const dest = destinationOn(trip, date);
  const prevDest = prev ? destinationOn(trip, prev) : undefined;
  const travelling = dest && prevDest && dest.id !== prevDest.id;
  const forecast = useForecast(dest?.lat, dest?.lon);
  const wx = forecast?.[date];
  const isToday = date === todayIso();
  const acts = trip.activities.filter((a) => a.date === date).sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
  const checkIns = trip.stays.filter((s) => s.status === "booked" && s.checkIn === date);
  const checkOuts = trip.stays.filter((s) => s.status === "booked" && s.checkOut === date);

  return (
    <Card className={cx("scroll-mt-36 overflow-hidden", isToday && "ring-4 ring-sun/60")}>
      <section id={`day-${date}`} aria-label={`Day ${index + 1}`} className="grid sm:grid-cols-[7rem_1fr]">
        {/* date stamp */}
        <div className={cx("flex items-center gap-3 px-5 pt-5 sm:flex-col sm:items-start sm:gap-0 sm:border-r sm:border-dashed sm:border-line sm:p-5", isToday && "sm:bg-sun-soft/50")}>
          <span className="text-[11px] font-bold uppercase tracking-wider text-coral">Day {index + 1}</span>
          <span className="font-display text-3xl font-extrabold leading-none sm:mt-1 sm:text-4xl">{fmtDate(date, { day: "numeric" })}</span>
          <span className="text-sm font-semibold text-muted">
            {fmtDate(date, { weekday: "short" })} · {fmtDate(date, { month: "short" })}
          </span>
          {isToday ? (
            <span className="ml-auto sm:mt-2 sm:ml-0">
              <Pill tone="sun">Today</Pill>
            </span>
          ) : null}
        </div>

        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {travelling ? (
                <p className="flex items-center gap-2 font-display text-lg font-bold">
                  <Icon.Plane className="size-5 text-sky" /> {prevDest!.name} <Icon.ArrowRight className="size-4 text-muted" /> {dest!.name}
                </p>
              ) : dest ? (
                <p className="flex items-center gap-2 font-display text-lg font-bold">
                  <Icon.Pin className="size-5 text-accent" /> {dest.name}
                </p>
              ) : (
                <p className="font-display text-lg font-bold text-muted">{fmtDate(date, { weekday: "long" })}</p>
              )}
              {travelling ? <p className="text-sm text-muted">Travel day</p> : null}
            </div>
            {wx ? <WeatherBadge wx={wx} /> : null}
          </div>

          {checkOuts.length || checkIns.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {checkOuts.map((s) => (
                <Pill key={"o" + s.id} icon="Suitcase">
                  Check out · {s.name}
                </Pill>
              ))}
              {checkIns.map((s) => (
                <Pill key={"i" + s.id} tone="plum" icon="Bed">
                  Check in · {s.name}
                </Pill>
              ))}
            </div>
          ) : null}

          {acts.length ? (
            <ol className="mt-3 divide-y divide-line">
              {acts.map((a) => (
                <ActivityRow key={a.id} a={a} onEdit={() => onEdit(a)} />
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-muted">Nothing planned yet.</p>
          )}

          {ro ? null : (
            <Button size="sm" variant="ghost" icon="Plus" className="mt-2 -ml-3" onClick={onAdd}>
              Add to this day
            </Button>
          )}
        </div>
      </section>
    </Card>
  );
}

function ActivityRow({ a, onEdit, showDate }: { a: Activity; onEdit: () => void; showDate?: boolean }) {
  const ro = useReadOnly();
  return (
    <li className="flex items-start gap-3 py-3">
      <CatIcon c={a.category} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-snug">{a.title}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted">
          <span className="font-mono">{showDate && a.date ? `${fmtDate(a.date)} · ` : ""}{a.time || "Any time"}</span>
          {a.place ? <span>{a.place}</span> : null}
          {a.cost ? <span>{fmtMoney(a.cost, a.currency)}</span> : null}
          {a.url ? (
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
              {hostOf(a.url)} <Icon.External className="size-3.5" />
            </a>
          ) : null}
        </p>
        {a.notes ? <p className="mt-1 text-sm">{a.notes}</p> : null}
      </div>
      {ro ? null : <IconButton icon="Pencil" label={`Edit ${a.title}`} onClick={onEdit} />}
    </li>
  );
}
