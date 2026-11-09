"use client";

import { useSyncExternalStore } from "react";
import { CATEGORIES, type LocalTrip, type Trip } from "./types";
import { MEMBER_COLORS, addDays, randomId, todayIso } from "./util";

/* ------------------------------------------------------------------ */
/*  Local-first store: every trip lives in this browser's localStorage */
/*  under one key. Shared trips additionally sync with the server.     */
/* ------------------------------------------------------------------ */

const KEY = "waypoint:v1:trips";
type State = Record<string, LocalTrip>;

const listeners = new Set<() => void>();
let cacheRaw: string | null = null;
let cache: State = {};
const EMPTY: State = {};

function read(): State {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return cache; // storage blocked (private mode): fall back to memory
  }
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  try {
    cache = raw ? (JSON.parse(raw) as State) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function write(next: State) {
  cache = next;
  try {
    cacheRaw = JSON.stringify(next);
    window.localStorage.setItem(KEY, cacheRaw);
  } catch {
    cacheRaw = null; // quota or blocked: keep in memory for this session
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key === KEY && l(); // other tabs
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** All trips on this device. `null` until the browser store has been read (avoids SSR mismatch). */
export function useTrips(): State | null {
  return useSyncExternalStore<State | null>(subscribe, read, () => null);
}

export function useLocalTrip(id: string): LocalTrip | null | undefined {
  const all = useTrips();
  if (all === null) return undefined; // still loading
  return all[id] ?? null;
}

export function getLocalTrip(id: string): LocalTrip | undefined {
  return read()[id];
}

export function putLocalTrip(lt: LocalTrip) {
  write({ ...read(), [lt.trip.id]: lt });
}

export function deleteLocalTrip(id: string) {
  const next = { ...read() };
  delete next[id];
  write(next);
}

/** Apply an edit. Marks the trip dirty so the sync engine pushes it. */
export function updateTrip(id: string, fn: (t: Trip) => void) {
  const cur = read()[id];
  if (!cur) return;
  const trip = structuredClone(cur.trip);
  fn(trip);
  trip.updatedAt = new Date().toISOString();
  write({ ...read(), [id]: { ...cur, trip, dirty: Boolean(cur.share?.editKey) } });
}

export function patchLocal(id: string, patch: Partial<LocalTrip>) {
  const cur = read()[id];
  if (!cur) return;
  write({ ...read(), [id]: { ...cur, ...patch } });
}

export function findByShareId(shareId: string): LocalTrip | undefined {
  return Object.values(read()).find((t) => t.share?.id === shareId);
}

/* ---------- factories ---------- */

export function blankTrip(input: {
  name: string;
  startDate: string;
  endDate: string;
  currency: string;
  yourName: string;
}): LocalTrip {
  const now = new Date().toISOString();
  const memberId = randomId(8);
  const trip: Trip = {
    schema: 1,
    id: randomId(10),
    name: input.name.trim() || "Untitled trip",
    startDate: input.startDate,
    endDate: input.endDate || input.startDate,
    currency: input.currency,
    notes: "",
    families: [],
    members: [
      { id: memberId, name: input.yourName.trim() || "Me", color: MEMBER_COLORS[0], familyId: null },
    ],
    destinations: [],
    stays: [],
    activities: [],
    expenses: [],
    budget: { total: 0, categories: Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Trip["budget"]["categories"] },
    createdAt: now,
    updatedAt: now,
  };
  return { trip, me: memberId };
}

/** Fresh local copy of any trip (import, "make my own copy"). New ids for the trip only. */
export function cloneAsNew(trip: Trip, nameSuffix = ""): LocalTrip {
  const now = new Date().toISOString();
  const copy = structuredClone(trip);
  copy.id = randomId(10);
  copy.name = (copy.name + nameSuffix).slice(0, 80);
  copy.createdAt = now;
  copy.updatedAt = now;
  return { trip: copy, me: copy.members[0]?.id };
}

/** A realistic demo so portfolio visitors see every feature immediately. */
export function sampleTrip(): LocalTrip {
  const start = addDays(todayIso(), 21);
  const d = (n: number) => addDays(start, n);
  const now = new Date().toISOString();
  const fam = { mk: randomId(6), on: randomId(6) };
  const m = { neema: randomId(8), brian: randomId(8), akinyi: randomId(8), otieno: randomId(8), wanjiru: randomId(8) };
  const dest = { nbo: randomId(8), aru: randomId(8), znz: randomId(8), stn: randomId(8) };

  const trip: Trip = {
    schema: 1,
    id: randomId(10),
    name: "Arusha & Zanzibar family trip",
    startDate: start,
    endDate: d(6),
    currency: "KES",
    notes: "Two families, one week. Safari first, beach after.",
    families: [
      { id: fam.mk, name: "Mkenda family" },
      { id: fam.on, name: "Onyango family" },
    ],
    members: [
      { id: m.neema, name: "Neema", color: MEMBER_COLORS[0], familyId: fam.mk },
      { id: m.brian, name: "Brian", color: MEMBER_COLORS[1], familyId: fam.mk },
      { id: m.akinyi, name: "Akinyi", color: MEMBER_COLORS[2], familyId: fam.on },
      { id: m.otieno, name: "Otieno", color: MEMBER_COLORS[3], familyId: fam.on },
      { id: m.wanjiru, name: "Wanjiru", color: MEMBER_COLORS[4], familyId: null },
    ],
    destinations: [
      { id: dest.nbo, name: "Nairobi", country: "Kenya", lat: -1.2833, lon: 36.8167, arrive: d(0), depart: d(0), status: "planned", votes: [], notes: "Meet at the bus station, 6:30am." },
      { id: dest.aru, name: "Arusha", country: "Tanzania", lat: -3.3667, lon: 36.6833, arrive: d(0), depart: d(2), status: "planned", votes: [m.neema, m.akinyi, m.otieno], notes: "Base for the Tarangire day trip." },
      { id: dest.znz, name: "Zanzibar City", country: "Tanzania", lat: -6.1659, lon: 39.2026, arrive: d(3), depart: d(6), status: "planned", votes: [m.neema, m.brian, m.akinyi, m.wanjiru], notes: "" },
      { id: dest.stn, name: "Stone Town", country: "Tanzania", lat: -6.1622, lon: 39.1921, arrive: "", depart: "", status: "idea", votes: [m.wanjiru], notes: "Spice tour? Vote if you're in." },
    ],
    stays: [
      { id: randomId(8), name: "Kibo Palace Hotel", destinationId: dest.aru, url: "https://www.booking.com/", address: "Arusha", checkIn: d(0), checkOut: d(3), price: 54000, currency: "KES", status: "booked", votes: [m.neema, m.otieno], notes: "2 family rooms, breakfast included." },
      { id: randomId(8), name: "Beach villa, Paje", destinationId: dest.znz, url: "https://www.airbnb.com/", address: "Paje, Zanzibar", checkIn: d(3), checkOut: d(6), price: 780, currency: "USD", status: "idea", votes: [m.brian, m.akinyi, m.wanjiru], notes: "Sleeps 6. Pool." },
      { id: randomId(8), name: "Stone Town guesthouse", destinationId: dest.znz, url: "https://www.booking.com/", address: "Stone Town", checkIn: d(3), checkOut: d(6), price: 620, currency: "USD", status: "idea", votes: [m.otieno], notes: "" },
    ],
    activities: [
      { id: randomId(8), date: d(0), time: "07:00", title: "Shuttle from Nairobi to Arusha", place: "Nairobi bus station", url: "", category: "transport", cost: 4500, currency: "KES", notes: "Book 5 seats" },
      { id: randomId(8), date: d(0), time: "19:30", title: "Welcome dinner", place: "Arusha town", url: "", category: "food", cost: 0, currency: "KES", notes: "" },
      { id: randomId(8), date: d(1), time: "06:00", title: "Tarangire game drive", place: "Tarangire National Park", url: "https://www.tanzaniaparks.go.tz/", category: "activities", cost: 120, currency: "USD", notes: "Packed lunch from hotel" },
      { id: randomId(8), date: d(2), time: "10:00", title: "Coffee farm tour", place: "Arusha", url: "", category: "activities", cost: 25, currency: "USD", notes: "" },
      { id: randomId(8), date: d(3), time: "09:15", title: "Flight to Zanzibar", place: "Arusha Airport", url: "", category: "transport", cost: 110, currency: "USD", notes: "Check baggage limits" },
      { id: randomId(8), date: d(4), time: "08:00", title: "Snorkelling at Mnemba", place: "Mnemba Atoll", url: "", category: "activities", cost: 45, currency: "USD", notes: "" },
      { id: randomId(8), date: d(5), time: "16:00", title: "Forodhani night market", place: "Stone Town", url: "", category: "food", cost: 15, currency: "USD", notes: "" },
      { id: randomId(8), date: d(6), time: "13:00", title: "Flight home", place: "Zanzibar Airport", url: "", category: "transport", cost: 0, currency: "KES", notes: "" },
    ],
    expenses: [
      { id: randomId(8), title: "Bus tickets", amount: 22500, currency: "KES", category: "transport", date: d(0), paidBy: m.neema, splitAmong: [m.neema, m.brian, m.akinyi, m.otieno, m.wanjiru] },
      { id: randomId(8), title: "Hotel deposit", amount: 27000, currency: "KES", category: "stay", date: d(-10), paidBy: m.akinyi, splitAmong: [m.neema, m.brian, m.akinyi, m.otieno, m.wanjiru] },
      { id: randomId(8), title: "Park fees", amount: 600, currency: "USD", category: "activities", date: d(1), paidBy: m.otieno, splitAmong: [m.neema, m.brian, m.akinyi, m.otieno, m.wanjiru] },
      { id: randomId(8), title: "Dinner at Khan's", amount: 9800, currency: "KES", category: "food", date: d(1), paidBy: m.brian, splitAmong: [m.neema, m.brian, m.akinyi, m.otieno] },
      { id: randomId(8), title: "Souvenirs", amount: 4200, currency: "KES", category: "shopping", date: d(2), paidBy: m.wanjiru, splitAmong: [m.wanjiru] },
    ],
    budget: {
      total: 450000,
      categories: { stay: 180000, transport: 110000, food: 60000, activities: 80000, shopping: 10000, other: 10000 },
    },
    createdAt: now,
    updatedAt: now,
  };
  return { trip, me: m.neema };
}
