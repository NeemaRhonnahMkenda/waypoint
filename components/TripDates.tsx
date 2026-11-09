"use client";

import { addDays, cx, daysBetween } from "../lib/util";
import { Field, inputCls } from "./ui";

/**
 * Start/end date fields that can't go wrong:
 *  - moving the start keeps the trip length (end moves with it)
 *  - the end can't be before the start
 *  - quick lengths for the common cases
 *  - a plain-language summary ("5 days, 4 nights")
 */
export default function TripDates({
  start,
  end,
  onChange,
}: {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
}) {
  const nights = start && end ? Math.max(0, daysBetween(start, end)) : 0;
  const presets = [
    { label: "Weekend", nights: 2 },
    { label: "4 nights", nights: 4 },
    { label: "1 week", nights: 7 },
    { label: "2 weeks", nights: 14 },
  ];

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Leaving">
          {(id) => (
            <input
              id={id}
              type="date"
              className={inputCls}
              value={start}
              onChange={(e) => {
                const s = e.target.value;
                if (!s) return;
                onChange(s, addDays(s, nights)); // keep the same length
              }}
            />
          )}
        </Field>
        <Field label="Coming back">
          {(id) => (
            <input
              id={id}
              type="date"
              className={inputCls}
              value={end}
              min={start}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                onChange(start, v < start ? start : v);
              }}
            />
          )}
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(start, addDays(start, p.nights))}
            className={cx(
              "min-h-9 rounded-full border px-3.5 text-[13px] font-semibold transition",
              nights === p.nights ? "border-accent bg-accent-soft text-accent" : "border-line hover:border-ink/30",
            )}
          >
            {p.label}
          </button>
        ))}
        <span className="ml-auto text-sm font-medium text-muted">
          {nights + 1} day{nights === 0 ? "" : "s"} · {nights} night{nights === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
