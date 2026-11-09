"use client";

import { useState } from "react";
import { whereEachDay } from "../../lib/places";
import { updateTrip } from "../../lib/store";
import { safeUrl, type Stay, type Trip } from "../../lib/types";
import { CURRENCIES, cx, daysBetween, eachDay, hostOf, randomId } from "../../lib/util";
import { Icon } from "../icons";
import { Button, DayPicker, Field, Modal, Segmented, inputCls, stayDays } from "../ui";

export default function StayModal({ trip, initial, onClose }: { trip: Trip; initial?: Stay; onClose: () => void }) {
  const tripDays = eachDay(trip.startDate, trip.endDate);
  const days = stayDays(tripDays);
  const planned = trip.destinations.filter((d) => d.status === "planned");

  const [s, setS] = useState<Stay>(() => {
    if (initial) return initial;
    const first = planned[0];
    return {
      id: randomId(8),
      name: "",
      destinationId: first?.id ?? null,
      url: "",
      address: "",
      checkIn: first?.arrive || trip.startDate,
      checkOut: first?.depart && first.depart > (first.arrive || "") ? first.depart : trip.endDate,
      price: 0,
      currency: trip.currency,
      status: "idea",
      votes: [],
      notes: "",
    };
  });
  const [priceMode, setPriceMode] = useState<"total" | "night">("total");
  const set = <K extends keyof Stay>(k: K, v: Stay[K]) => setS((p) => ({ ...p, [k]: v }));
  const nights = s.checkIn && s.checkOut ? Math.max(0, daysBetween(s.checkIn, s.checkOut)) : 0;
  const urlOk = safeUrl.safeParse(s.url.trim()).success;
  const valid = s.name.trim() && urlOk && nights > 0;
  const shown = priceMode === "night" && nights ? Math.round((s.price / nights) * 100) / 100 : s.price;

  /** Picking a stop fills in its dates, the most common case. */
  function chooseDestination(id: string | null) {
    const d = trip.destinations.find((x) => x.id === id);
    setS((p) => ({
      ...p,
      destinationId: id,
      ...(d?.arrive ? { checkIn: d.arrive, checkOut: d.depart && d.depart > d.arrive ? d.depart : days[days.indexOf(d.arrive) + 1] ?? d.arrive } : {}),
    }));
  }

  function save() {
    if (!valid) return;
    const clean = { ...s, name: s.name.trim(), url: s.url.trim() };
    updateTrip(trip.id, (t) => {
      const i = t.stays.findIndex((x) => x.id === clean.id);
      if (i >= 0) t.stays[i] = clean;
      else t.stays.push(clean);
    });
    onClose();
  }

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={initial ? "Edit place to stay" : "Add a place to stay"}
      footer={
        <>
          {initial ? (
            <Button
              variant="danger"
              icon="Trash"
              className="mr-auto"
              onClick={() => {
                updateTrip(trip.id, (t) => (t.stays = t.stays.filter((x) => x.id !== s.id)));
                onClose();
              }}
            >
              Delete
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon="Check" disabled={!valid} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <form
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field
          label="Paste the link"
          hint={
            !urlOk ? (
              <span className="text-coral">Links need to start with https://</span>
            ) : s.url ? (
              <span className="inline-flex items-center gap-1">
                <Icon.Link className="size-3.5" /> {hostOf(s.url)}
              </span>
            ) : (
              "Airbnb, Booking.com, the hotel's own site…"
            )
          }
        >
          {(id) => <input id={id} autoFocus={!initial} type="url" inputMode="url" className={inputCls} value={s.url} placeholder="https://" onChange={(e) => set("url", e.target.value)} />}
        </Field>
        <Field label="Name">
          {(id) => <input id={id} className={inputCls} value={s.name} maxLength={100} placeholder="e.g. Beach villa in Paje" onChange={(e) => set("name", e.target.value)} />}
        </Field>

        {planned.length ? (
          <div>
            <p className="mb-2 text-[13px] font-semibold">In which stop?</p>
            <div className="flex flex-wrap gap-2">
              {planned.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => chooseDestination(d.id)}
                  aria-pressed={s.destinationId === d.id}
                  className={cx(
                    "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition",
                    s.destinationId === d.id ? "border-accent bg-accent-soft text-accent" : "border-line hover:border-ink/30",
                  )}
                >
                  <Icon.Pin className="size-4" /> {d.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {days.length ? (
          <DayPicker
            label="Check in and check out"
            days={days}
            mode="range"
            nights
            start={s.checkIn}
            end={s.checkOut}
            marks={whereEachDay(trip, days)}
            onChange={(checkIn, checkOut) => setS((p) => ({ ...p, checkIn, checkOut }))}
          />
        ) : null}

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] font-semibold">Price</span>
            <Segmented
              label="Price is"
              value={priceMode}
              onChange={setPriceMode}
              options={[
                { value: "total", label: "Total" },
                { value: "night", label: "Per night" },
              ]}
            />
          </div>
          <div className="grid grid-cols-[1.4fr_1fr] gap-3">
            <label className="sr-only" htmlFor="stay-price">
              Price {priceMode === "night" ? "per night" : "total"}
            </label>
            <input
              id="stay-price"
              type="number"
              inputMode="decimal"
              min={0}
              className={inputCls}
              value={shown || ""}
              onChange={(e) => {
                const v = Math.max(0, Number(e.target.value) || 0);
                set("price", priceMode === "night" ? v * Math.max(1, nights) : v);
              }}
            />
            <label className="sr-only" htmlFor="stay-cur">
              Currency
            </label>
            <select id="stay-cur" className={inputCls} value={s.currency} onChange={(e) => set("currency", e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          {s.price && nights ? (
            <p className="mt-1.5 text-xs text-muted">
              {priceMode === "night"
                ? `${nights} nights = ${s.price.toLocaleString("en")} ${s.currency} total`
                : `About ${Math.round(s.price / nights).toLocaleString("en")} ${s.currency} a night`}
            </p>
          ) : null}
        </div>

        <Segmented
          label="Status"
          value={s.status}
          onChange={(v) => set("status", v)}
          options={[
            { value: "idea", label: "Option to vote on" },
            { value: "booked", label: "Booked" },
          ]}
        />

        <Field label="Notes">
          {(id) => <textarea id={id} rows={2} className={`${inputCls} py-2.5`} value={s.notes} maxLength={1000} placeholder="Rooms, breakfast, pool, how far from town…" onChange={(e) => set("notes", e.target.value)} />}
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
