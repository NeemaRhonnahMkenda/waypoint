"use client";

import { useEffect, useState } from "react";
import type { Category, Trip } from "./types";
import { CATEGORIES } from "./types";

/* ------------------------------------------------------------------ */
/*  Exchange rates (open.er-api.com, free, no key) and budget maths.   */
/* ------------------------------------------------------------------ */

type Rates = Record<string, number>; // units of X per 1 base
const TTL = 12 * 60 * 60 * 1000;

async function fetchRates(base: string): Promise<Rates | null> {
  const key = `waypoint:rates:${base}`;
  try {
    const cached = JSON.parse(localStorage.getItem(key) ?? "null") as { at: number; rates: Rates } | null;
    if (cached && Date.now() - cached.at < TTL) return cached.rates;
  } catch {}
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { result: string; rates?: Rates };
    if (json.result !== "success" || !json.rates) return null;
    try {
      localStorage.setItem(key, JSON.stringify({ at: Date.now(), rates: json.rates }));
    } catch {}
    return json.rates;
  } catch {
    return null;
  }
}

/** Rates relative to the trip currency. `null` while loading, `{}` if unavailable. */
export function useRates(base: string, needed: boolean) {
  const [rates, setRates] = useState<Rates | null>(needed ? null : {});
  useEffect(() => {
    if (!needed) return;
    let alive = true;
    fetchRates(base).then((r) => alive && setRates(r ?? {}));
    return () => {
      alive = false;
    };
  }, [base, needed]);
  return needed ? rates : ({} as Rates);
}

/** Convert into the trip currency. Returns null when no rate is known. */
export function convert(amount: number, from: string, base: string, rates: Rates | null): number | null {
  if (from === base) return amount;
  const r = rates?.[from];
  if (!r) return null;
  return amount / r;
}

export function currenciesUsed(trip: Trip) {
  const s = new Set<string>();
  trip.expenses.forEach((e) => s.add(e.currency));
  trip.stays.forEach((e) => s.add(e.currency));
  trip.activities.forEach((e) => s.add(e.currency));
  s.delete(trip.currency);
  return [...s];
}

export type BudgetSummary = {
  spentByCategory: Record<Category, number>;
  plannedByCategory: Record<Category, number>; // stays + activity costs (not yet paid)
  spentTotal: number;
  plannedTotal: number;
  spentByDay: { date: string; amount: number }[];
  unconverted: number; // count of items with no exchange rate
};

const zero = () => Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;

export function summarise(trip: Trip, rates: Rates | null): BudgetSummary {
  const spentByCategory = zero();
  const plannedByCategory = zero();
  const byDay = new Map<string, number>();
  let unconverted = 0;

  for (const e of trip.expenses) {
    const v = convert(e.amount, e.currency, trip.currency, rates);
    if (v === null) {
      unconverted++;
      continue;
    }
    spentByCategory[e.category] += v;
    if (e.date) byDay.set(e.date, (byDay.get(e.date) ?? 0) + v);
  }
  for (const s of trip.stays) {
    if (s.status !== "booked") continue; // only count stays the group committed to
    const v = convert(s.price, s.currency, trip.currency, rates);
    if (v === null) unconverted++;
    else plannedByCategory.stay += v;
  }
  for (const a of trip.activities) {
    if (!a.cost) continue;
    const v = convert(a.cost, a.currency, trip.currency, rates);
    if (v === null) unconverted++;
    else plannedByCategory[a.category] += v;
  }

  const sum = (r: Record<Category, number>) => Object.values(r).reduce((a, b) => a + b, 0);
  return {
    spentByCategory,
    plannedByCategory,
    spentTotal: sum(spentByCategory),
    plannedTotal: sum(plannedByCategory),
    spentByDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount })),
    unconverted,
  };
}

/* ---------- who owes whom ---------- */

export type Balance = { id: string; name: string; color?: string; paid: number; share: number; net: number };

/** Net balance per person, or per family (people without a family stand alone). */
export function balances(trip: Trip, rates: Rates | null, by: "person" | "family"): Balance[] {
  const person = new Map<string, { paid: number; share: number }>();
  trip.members.forEach((m) => person.set(m.id, { paid: 0, share: 0 }));

  for (const e of trip.expenses) {
    const v = convert(e.amount, e.currency, trip.currency, rates);
    if (v === null) continue;
    const split = e.splitAmong.filter((id) => person.has(id));
    if (!split.length || !person.has(e.paidBy)) continue;
    person.get(e.paidBy)!.paid += v;
    split.forEach((id) => (person.get(id)!.share += v / split.length));
  }

  if (by === "person") {
    return trip.members.map((m) => {
      const p = person.get(m.id)!;
      return { id: m.id, name: m.name, color: m.color, paid: p.paid, share: p.share, net: p.paid - p.share };
    });
  }

  const groups = new Map<string, Balance>();
  for (const m of trip.members) {
    const fam = m.familyId ? trip.families.find((f) => f.id === m.familyId) : undefined;
    const key = fam ? fam.id : m.id;
    const name = fam ? fam.name : m.name;
    const g = groups.get(key) ?? { id: key, name, paid: 0, share: 0, net: 0 };
    const p = person.get(m.id)!;
    g.paid += p.paid;
    g.share += p.share;
    g.net = g.paid - g.share;
    groups.set(key, g);
  }
  return [...groups.values()];
}

/** Fewest-transfers settle-up (greedy: largest debtor pays largest creditor). */
export function settleUp(list: Balance[]): { from: string; to: string; amount: number }[] {
  const eps = 0.5;
  const debt = list.filter((b) => b.net < -eps).map((b) => ({ ...b, left: -b.net })).sort((a, b) => b.left - a.left);
  const cred = list.filter((b) => b.net > eps).map((b) => ({ ...b, left: b.net })).sort((a, b) => b.left - a.left);
  const out: { from: string; to: string; amount: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < debt.length && j < cred.length) {
    const amt = Math.min(debt[i].left, cred[j].left);
    out.push({ from: debt[i].name, to: cred[j].name, amount: amt });
    debt[i].left -= amt;
    cred[j].left -= amt;
    if (debt[i].left < eps) i++;
    if (cred[j].left < eps) j++;
  }
  return out;
}
