"use client";

import { useState } from "react";
import { whereEachDay } from "../../lib/places";
import { updateTrip } from "../../lib/store";
import { safeUrl, type Activity, type Trip } from "../../lib/types";
import { CURRENCIES, cx, eachDay, randomId } from "../../lib/util";
import { Button, CategoryPicker, DayPicker, Field, Modal, inputCls } from "../ui";

const TIME_PRESETS = [
  { label: "Morning", value: "09:00" },
  { label: "Lunch", value: "13:00" },
  { label: "Afternoon", value: "15:00" },
  { label: "Evening", value: "19:00" },
];

export default function ActivityModal({
  trip,
  onClose,
  initial,
  date,
}: {
  trip: Trip;
  onClose: () => void;
  initial?: Activity;
  date?: string;
}) {
  const days = eachDay(trip.startDate, trip.endDate);
  const [a, setA] = useState<Activity>(
    () =>
      initial ?? {
        id: randomId(8),
        date: date ?? days[0] ?? trip.startDate,
        time: "",
        title: "",
        place: "",
        url: "",
        category: "activities",
        cost: 0,
        currency: trip.currency,
        notes: "",
      },
  );
  const [more, setMore] = useState(Boolean(initial && (initial.url || initial.notes || initial.cost)));
  const set = <K extends keyof Activity>(k: K, v: Activity[K]) => setA((p) => ({ ...p, [k]: v }));
  const urlOk = safeUrl.safeParse(a.url.trim()).success;
  const valid = a.title.trim() && urlOk;
  const marks = whereEachDay(trip, days);
  const outside = a.date && !days.includes(a.date);

  function save() {
    if (!valid) return;
    const clean = { ...a, title: a.title.trim(), url: a.url.trim() };
    updateTrip(trip.id, (t) => {
      const i = t.activities.findIndex((x) => x.id === clean.id);
      if (i >= 0) t.activities[i] = clean;
      else t.activities.push(clean);
    });
    onClose();
  }

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={initial ? "Edit plan" : "Add a plan"}
      footer={
        <>
          {initial ? (
            <Button
              variant="danger"
              icon="Trash"
              className="mr-auto"
              onClick={() => {
                updateTrip(trip.id, (t) => (t.activities = t.activities.filter((x) => x.id !== a.id)));
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
            Save plan
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
        <Field label="What are you doing?">
          {(id) => <input id={id} autoFocus className={inputCls} value={a.title} maxLength={100} placeholder="e.g. Sunset dhow cruise" onChange={(e) => set("title", e.target.value)} />}
        </Field>

        <DayPicker label="Which day?" days={days} mode="single" start={a.date} onChange={(d) => set("date", d)} marks={marks} />
        {outside ? <p className="-mt-3 text-xs text-coral">Currently outside the trip dates. Pick a day above to move it.</p> : null}

        <div>
          <p className="mb-2 text-[13px] font-semibold">What time?</p>
          <div className="flex flex-wrap items-center gap-2">
            {TIME_PRESETS.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => set("time", t.value)}
                className={cx(
                  "min-h-10 rounded-full border px-3.5 text-[13px] font-semibold transition",
                  a.time === t.value ? "border-accent bg-accent-soft text-accent" : "border-line hover:border-ink/30",
                )}
              >
                {t.label}
              </button>
            ))}
            <label className="sr-only" htmlFor="act-time">
              Exact time
            </label>
            <input id="act-time" type="time" className={cx(inputCls, "w-32")} value={a.time} onChange={(e) => set("time", e.target.value)} />
            {a.time ? (
              <button type="button" className="text-xs font-semibold text-muted hover:text-ink" onClick={() => set("time", "")}>
                Any time
              </button>
            ) : null}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold">Type</p>
          <CategoryPicker value={a.category} onChange={(c) => set("category", c)} />
        </div>

        <Field label="Where">
          {(id) => <input id={id} className={inputCls} value={a.place} maxLength={120} placeholder="Place or address (optional)" onChange={(e) => set("place", e.target.value)} />}
        </Field>

        {more ? (
          <>
            <div className="grid grid-cols-[1.4fr_1fr] gap-3">
              <Field label="Estimated cost" hint="For the whole group. Shows as committed in Budget.">
                {(id) => <input id={id} type="number" inputMode="decimal" min={0} className={inputCls} value={a.cost || ""} onChange={(e) => set("cost", Math.max(0, Number(e.target.value) || 0))} />}
              </Field>
              <Field label="Currency">
                {(id) => (
                  <select id={id} className={inputCls} value={a.currency} onChange={(e) => set("currency", e.target.value)}>
                    {CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
            <Field label="Link" hint={urlOk ? "Tickets, booking or a map link" : <span className="text-coral">Links need to start with https://</span>}>
              {(id) => <input id={id} type="url" inputMode="url" className={inputCls} value={a.url} placeholder="https://" onChange={(e) => set("url", e.target.value)} />}
            </Field>
            <Field label="Notes">
              {(id) => <textarea id={id} rows={3} className={`${inputCls} py-2.5`} value={a.notes} maxLength={1000} onChange={(e) => set("notes", e.target.value)} />}
            </Field>
          </>
        ) : (
          <Button size="sm" variant="ghost" icon="Plus" className="-ml-2 justify-self-start" onClick={() => setMore(true)}>
            Add cost, link or notes
          </Button>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
