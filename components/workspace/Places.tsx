"use client";

import { useEffect, useState } from "react";
import { searchPlaces, type PlaceHit } from "../../lib/places";
import { updateTrip } from "../../lib/store";
import type { Destination, LocalTrip, Stay } from "../../lib/types";
import { cx, daysBetween, fmtMoney, fmtRange, hostOf, randomId } from "../../lib/util";
import { Icon } from "../icons";
import TripMap from "../TripMap";
import { Button, Card, Empty, IconButton, SectionTitle, inputCls, useReadOnly } from "../ui";
import DestinationModal from "./DestinationModal";
import StayModal from "./StayModal";

type DestEdit = { d: Destination; isNew?: boolean; key: number } | null;

export default function Places({ lt }: { lt: LocalTrip }) {
  const { trip } = lt;
  const ro = useReadOnly();
  const [stayEdit, setStayEdit] = useState<{ stay?: Stay; key: number } | null>(null);
  const [destEdit, setDestEdit] = useState<DestEdit>(null);

  return (
    <div className="grid gap-10">
      <section>
        <SectionTitle title="Where you're going" sub="Numbered stops make the route. Ideas wait for the group's votes." />
        <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
          <div className="order-2 lg:order-1">
            {ro ? null : (
              <PlaceSearch
                preferCountries={[...new Set(trip.destinations.map((d) => d.country).filter(Boolean))]}
                onPick={(h) =>
                  setDestEdit({
                    isNew: true,
                    key: Date.now(),
                    d: {
                      id: randomId(8),
                      name: h.name,
                      country: h.country ?? "",
                      lat: h.latitude,
                      lon: h.longitude,
                      arrive: "",
                      depart: "",
                      status: "planned",
                      votes: [],
                      notes: "",
                    },
                  })
                }
              />
            )}
            <DestinationList lt={lt} onEdit={(d) => setDestEdit({ d, key: Date.now() })} />
          </div>
          <TripMap destinations={trip.destinations} className="order-1 h-72 lg:sticky lg:top-36 lg:order-2 lg:h-[30rem]" />
        </div>
      </section>

      <section>
        <SectionTitle
          title="Where you're staying"
          sub="Save links to options, vote, then mark one as booked."
          action={
            ro ? null : (
              <Button variant="primary" icon="Plus" onClick={() => setStayEdit({ key: Date.now() })}>
                Add a stay
              </Button>
            )
          }
        />
        {trip.stays.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...trip.stays]
              .sort((a, b) => Number(b.status === "booked") - Number(a.status === "booked") || b.votes.length - a.votes.length)
              .map((s) => (
                <StayCard key={s.id} lt={lt} s={s} onEdit={() => setStayEdit({ stay: s, key: Date.now() })} />
              ))}
          </div>
        ) : (
          <Empty
            icon="Bed"
            tone="plum"
            title="Nowhere to stay yet"
            body="Paste links from Airbnb, Booking.com or anywhere else so everyone can compare and vote."
            action={ro ? null : <Button icon="Plus" onClick={() => setStayEdit({ key: Date.now() })}>Add the first option</Button>}
          />
        )}
      </section>

      {stayEdit ? <StayModal key={stayEdit.key} trip={trip} initial={stayEdit.stay} onClose={() => setStayEdit(null)} /> : null}
      {destEdit ? <DestinationModal key={destEdit.key} trip={trip} initial={destEdit.d} isNew={destEdit.isNew} onClose={() => setDestEdit(null)} /> : null}
    </div>
  );
}

/* ---------- search (Open-Meteo geocoding, debounced) ---------- */

function PlaceSearch({ onPick, preferCountries }: { onPick: (h: PlaceHit) => void; preferCountries: string[] }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [err, setErr] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      if (q.trim().length < 2) {
        setHits([]);
        return;
      }
      setSearching(true);
      searchPlaces(q, ctrl.signal)
        .then((h) => {
          // Rank places in countries already on the trip first ("Diani" means Kenya, not Pakistan).
          const rank = (x: PlaceHit) => (preferCountries.includes(x.country) ? 0 : 1);
          h = [...h].sort((a, b) => rank(a) - rank(b));
          setHits(h);
          setErr(h.length ? "" : "No places match that. Try the nearest town or city.");
        })
        .catch((e) => e.name !== "AbortError" && setErr("Place search is unavailable right now."))
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="relative mb-4">
      <label htmlFor="place-search" className="sr-only">
        Search for a city or town
      </label>
      <Icon.Search className="pointer-events-none absolute top-3.5 left-4 size-5 text-muted" />
      <input
        id="place-search"
        className={cx(inputCls, "min-h-13 rounded-2xl pl-12 text-base shadow-sm")}
        placeholder="Add a city or town…"
        value={q}
        autoComplete="off"
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setQ("")}
      />
      {searching ? <span className="absolute top-4 right-4 size-4 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden /> : null}
      {err && q.trim().length >= 2 ? <p className="mt-2 text-sm text-muted">{err}</p> : null}
      {hits.length ? (
        <ul className="pop-in absolute inset-x-0 top-full z-[1050] mt-2 overflow-hidden rounded-2xl border border-line bg-card shadow-xl">
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(h);
                  setQ("");
                  setHits([]);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-paper"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Icon.Pin className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{h.name}</span>
                  <span className="block truncate text-sm text-muted">{[h.admin1, h.country].filter(Boolean).join(", ")}</span>
                </span>
                <Icon.Plus className="size-5 text-accent" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* ---------- destinations ---------- */

function VoteButton({ count, mine, disabled, onClick, voters }: { count: number; mine: boolean; disabled: boolean; onClick: () => void; voters: string[] }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={mine}
      title={voters.length ? `Votes: ${voters.join(", ")}` : "No votes yet"}
      className={cx(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-bold transition disabled:cursor-default",
        mine ? "border-coral bg-coral-soft text-coral" : "border-line text-muted hover:border-coral hover:text-coral",
      )}
    >
      <Icon.Heart className="size-4" filled={mine} /> {count}
      <span className="sr-only"> votes{mine ? ", including yours" : ""}</span>
    </button>
  );
}

function DestinationList({ lt, onEdit }: { lt: LocalTrip; onEdit: (d: Destination) => void }) {
  const { trip } = lt;
  const ro = useReadOnly();
  const planned = trip.destinations.filter((d) => d.status === "planned");

  if (!trip.destinations.length) {
    return <Empty icon="Route" title="No stops yet" body="Search above to add the first place you're heading to." />;
  }

  function move(id: string, dir: -1 | 1) {
    updateTrip(trip.id, (t) => {
      const i = t.destinations.findIndex((d) => d.id === id);
      const j = i + dir;
      if (j < 0 || j >= t.destinations.length) return;
      [t.destinations[i], t.destinations[j]] = [t.destinations[j], t.destinations[i]];
    });
  }

  function vote(d: Destination, mine: boolean) {
    updateTrip(trip.id, (t) => {
      const x = t.destinations.find((y) => y.id === d.id)!;
      x.votes = mine ? x.votes.filter((v) => v !== lt.me) : [...x.votes, lt.me!];
    });
  }

  return (
    <ol className="grid gap-3">
      {trip.destinations.map((d, i) => {
        const n = planned.findIndex((p) => p.id === d.id);
        const mine = lt.me ? d.votes.includes(lt.me) : false;
        const voters = d.votes.map((v) => trip.members.find((m) => m.id === v)?.name).filter(Boolean) as string[];
        const nights = d.arrive && d.depart ? daysBetween(d.arrive, d.depart) : 0;
        return (
          <li key={d.id}>
            <Card className={cx("p-4", d.status === "idea" && "border-2 border-dashed bg-card/70 shadow-none")}>
              <div className="flex items-center gap-3">
                <span
                  className={cx(
                    "grid size-10 shrink-0 place-items-center rounded-full font-display text-lg font-bold",
                    d.status === "planned" ? "bg-accent text-accent-ink" : "bg-sun-soft text-[#8a5a00]",
                  )}
                  aria-hidden
                >
                  {n >= 0 ? n + 1 : <Icon.Sparkle className="size-5" />}
                </span>
                <button type="button" disabled={ro} onClick={() => onEdit(d)} className="min-w-0 flex-1 text-left disabled:cursor-default">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-display text-lg font-bold">{d.name}</span>
                    <span className="text-sm text-muted">{d.country}</span>
                  </span>
                  <span className="block text-sm text-muted">
                    {d.status === "idea"
                      ? "Idea · tap to put it on the route"
                      : d.arrive
                        ? `${fmtRange(d.arrive, d.depart)}${nights ? ` · ${nights} night${nights === 1 ? "" : "s"}` : " · day stop"}`
                        : "Tap to choose your days"}
                  </span>
                </button>
                <VoteButton count={d.votes.length} mine={mine} voters={voters} disabled={ro || !lt.me} onClick={() => vote(d, mine)} />
              </div>
              {d.notes ? <p className="mt-2 pl-[3.25rem] text-sm">{d.notes}</p> : null}
              {ro ? null : (
                <div className="mt-2 flex items-center gap-1 pl-[3.25rem]">
                  <Button size="sm" variant="ghost" icon="Pencil" className="-ml-3" onClick={() => onEdit(d)}>
                    {d.status === "planned" && !d.arrive ? "Pick days" : "Edit"}
                  </Button>
                  <span className="ml-auto flex">
                    <IconButton icon="ChevronUp" label={`Move ${d.name} earlier`} disabled={i === 0} onClick={() => move(d.id, -1)} />
                    <IconButton icon="ChevronDown" label={`Move ${d.name} later`} disabled={i === trip.destinations.length - 1} onClick={() => move(d.id, 1)} />
                  </span>
                </div>
              )}
            </Card>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- stays ---------- */

function StayCard({ lt, s, onEdit }: { lt: LocalTrip; s: Stay; onEdit: () => void }) {
  const { trip } = lt;
  const ro = useReadOnly();
  const dest = trip.destinations.find((d) => d.id === s.destinationId);
  const nights = s.checkIn && s.checkOut ? daysBetween(s.checkIn, s.checkOut) : 0;
  const mine = lt.me ? s.votes.includes(lt.me) : false;
  const voters = s.votes.map((v) => trip.members.find((m) => m.id === v)?.name).filter(Boolean) as string[];

  return (
    <Card className={cx("flex flex-col overflow-hidden", s.status === "booked" && "ring-2 ring-accent")}>
      <div className={cx("flex items-center justify-between gap-2 px-5 py-3", s.status === "booked" ? "bg-accent text-accent-ink" : "bg-plum-soft")}>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold">
          {s.status === "booked" ? <Icon.Check className="size-4" strokeWidth={3} /> : <Icon.Bed className="size-4 text-plum" />}
          {s.status === "booked" ? "Booked" : "Option"}
        </span>
        {dest ? (
          <span className={cx("inline-flex items-center gap-1 truncate text-sm", s.status === "booked" ? "opacity-90" : "text-muted")}>
            <Icon.Pin className="size-4" /> {dest.name}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold leading-snug">{s.name}</h3>
        <p className="text-sm text-muted">
          {s.checkIn ? fmtRange(s.checkIn, s.checkOut) : "Dates not set"}
          {nights ? ` · ${nights} night${nights === 1 ? "" : "s"}` : ""}
        </p>
        {s.price ? (
          <p className="mt-3">
            <span className="font-display text-2xl font-extrabold">{fmtMoney(s.price, s.currency)}</span>
            {nights ? <span className="block text-sm text-muted">{fmtMoney(s.price / nights, s.currency)} a night</span> : null}
          </p>
        ) : null}
        {s.notes ? <p className="mt-2 text-sm">{s.notes}</p> : null}
        {voters.length ? <p className="mt-2 text-xs text-muted">Liked by {voters.join(", ")}</p> : null}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          {s.url ? (
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[13px] font-semibold text-paper transition hover:opacity-90"
            >
              {hostOf(s.url) || "Open link"} <Icon.External className="size-3.5" />
            </a>
          ) : null}
          <VoteButton
            count={s.votes.length}
            mine={mine}
            voters={voters}
            disabled={ro || !lt.me}
            onClick={() =>
              updateTrip(trip.id, (t) => {
                const x = t.stays.find((y) => y.id === s.id)!;
                x.votes = mine ? x.votes.filter((v) => v !== lt.me) : [...x.votes, lt.me!];
              })
            }
          />
          {ro ? null : <IconButton icon="Pencil" label={`Edit ${s.name}`} className="ml-auto" onClick={onEdit} />}
        </div>
      </div>
    </Card>
  );
}

