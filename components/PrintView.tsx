"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { currenciesUsed, summarise, useRates } from "../lib/money";
import { destinationOn } from "../lib/places";
import { useLocalTrip } from "../lib/store";
import { CATEGORIES, CATEGORY_LABEL, type Category } from "../lib/types";
import { daysBetween, eachDay, fmtDate, fmtMoney, fmtRange, to } from "../lib/util";

/** Paper-friendly itinerary. Black on white, no maps, every link printed in full. */
export default function PrintView() {
  const { id } = useParams<{ id: string }>();
  const lt = useLocalTrip(id);
  const trip = lt?.trip;
  const rates = useRates(trip?.currency ?? "USD", trip ? currenciesUsed(trip).length > 0 : false);

  if (lt === undefined) return null;
  if (!trip) {
    return (
      <p className="p-10 text-center">
        Trip not found. <Link href={to("/")} className="underline">Back</Link>
      </p>
    );
  }

  const days = eachDay(trip.startDate, trip.endDate);
  const sum = summarise(trip, rates);
  const planned = trip.destinations.filter((d) => d.status === "planned");
  const booked = trip.stays.filter((s) => s.status === "booked");

  return (
    <div className="min-h-full bg-white text-[#111]">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-8">
        <Link href={to(`/trips/${trip.id}`)} className="text-sm font-medium text-neutral-700 hover:underline">
          Back to trip
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-11 rounded-full bg-neutral-900 px-5 text-sm font-medium text-white"
        >
          Print or save as PDF
        </button>
      </div>

      <article className="mx-auto max-w-3xl px-6 py-10 text-[14px] leading-relaxed print:max-w-none print:px-0 print:py-0">
        <header className="border-b-2 border-neutral-900 pb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Waypoint itinerary</p>
          <h1 className="mt-1 font-display text-3xl font-bold">{trip.name}</h1>
          <p className="mt-1">
            {fmtRange(trip.startDate, trip.endDate)} · {days.length} days
            {planned.length ? ` · ${planned.map((d) => d.name).join(" · ")}` : ""}
          </p>
        </header>

        <section className="mt-6 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">Travellers</h2>
            {trip.families.map((f) => (
              <p key={f.id}>
                <strong>{f.name}:</strong> {trip.members.filter((m) => m.familyId === f.id).map((m) => m.name).join(", ") || "—"}
              </p>
            ))}
            {trip.members.filter((m) => !m.familyId).length ? (
              <p>{trip.members.filter((m) => !m.familyId).map((m) => m.name).join(", ")}</p>
            ) : null}
          </div>
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">Route</h2>
            <ol className="list-decimal pl-5">
              {planned.map((d) => (
                <li key={d.id}>
                  {d.name}
                  {d.country ? `, ${d.country}` : ""}
                  {d.arrive ? <span className="text-neutral-600"> · {fmtRange(d.arrive, d.depart)}</span> : null}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {booked.length ? (
          <section className="mt-8 break-inside-avoid">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">Where we&apos;re staying</h2>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-neutral-300 text-xs text-neutral-500">
                  <th className="py-1.5 pr-3 font-medium">Stay</th>
                  <th className="py-1.5 pr-3 font-medium">Dates</th>
                  <th className="py-1.5 font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {booked.map((s) => (
                  <tr key={s.id} className="border-b border-neutral-200 align-top">
                    <td className="py-2 pr-3">
                      <strong>{s.name}</strong>
                      {s.address ? <div className="text-neutral-600">{s.address}</div> : null}
                      {s.url ? <div className="break-all text-xs text-neutral-500">{s.url}</div> : null}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {fmtRange(s.checkIn, s.checkOut)}
                      {s.checkIn && s.checkOut ? <div className="text-neutral-600">{daysBetween(s.checkIn, s.checkOut)} nights</div> : null}
                    </td>
                    <td className="py-2 whitespace-nowrap">{s.price ? fmtMoney(s.price, s.currency) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        <section className="mt-8">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">Day by day</h2>
          {days.map((d, i) => {
            const acts = trip.activities.filter((a) => a.date === d).sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
            const dest = destinationOn(trip, d);
            return (
              <div key={d} className="break-inside-avoid border-t border-neutral-300 py-3">
                <h3 className="font-semibold">
                  Day {i + 1} · {fmtDate(d, { weekday: "long", day: "numeric", month: "long" })}
                  {dest ? <span className="font-normal text-neutral-600"> · {dest.name}</span> : null}
                </h3>
                {booked.filter((s) => s.checkIn === d).map((s) => (
                  <p key={s.id} className="text-neutral-700">Check in: {s.name}</p>
                ))}
                {acts.length ? (
                  <ul className="mt-1">
                    {acts.map((a) => (
                      <li key={a.id} className="grid grid-cols-[3.5rem_1fr] gap-2 py-0.5">
                        <span className="font-mono text-neutral-600">{a.time || "—"}</span>
                        <span>
                          <strong>{a.title}</strong>
                          {a.place ? ` · ${a.place}` : ""}
                          {a.cost ? ` · ${fmtMoney(a.cost, a.currency)}` : ""}
                          {a.notes ? <span className="block text-neutral-600">{a.notes}</span> : null}
                          {a.url ? <span className="block break-all text-xs text-neutral-500">{a.url}</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-neutral-500">Free day</p>
                )}
              </div>
            );
          })}
        </section>

        <section className="mt-8 break-inside-avoid">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">Budget ({trip.currency})</h2>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-300 text-xs text-neutral-500">
                <th className="py-1.5 font-medium">Category</th>
                <th className="py-1.5 text-right font-medium">Budget</th>
                <th className="py-1.5 text-right font-medium">Spent</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((c: Category) => (
                <tr key={c} className="border-b border-neutral-200">
                  <td className="py-1.5">{CATEGORY_LABEL[c]}</td>
                  <td className="py-1.5 text-right">{trip.budget.categories[c] ? fmtMoney(trip.budget.categories[c]!, trip.currency) : "—"}</td>
                  <td className="py-1.5 text-right">{sum.spentByCategory[c] ? fmtMoney(sum.spentByCategory[c], trip.currency) : "—"}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-1.5">Total</td>
                <td className="py-1.5 text-right">{trip.budget.total ? fmtMoney(trip.budget.total, trip.currency) : "—"}</td>
                <td className="py-1.5 text-right">{fmtMoney(sum.spentTotal, trip.currency)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {trip.notes ? (
          <section className="mt-8 break-inside-avoid">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">Notes</h2>
            <p className="whitespace-pre-wrap">{trip.notes}</p>
          </section>
        ) : null}

        <footer className="mt-10 border-t border-neutral-300 pt-3 text-xs text-neutral-500">
          Printed from Waypoint
        </footer>
      </article>
    </div>
  );
}
