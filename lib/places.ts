"use client";

import { useEffect, useState } from "react";
import type { Destination, Trip } from "./types";

/* ------------------------------------------------------------------ */
/*  Place search and weather, both from Open-Meteo (free, no API key). */
/* ------------------------------------------------------------------ */

export type PlaceHit = {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
};

export async function searchPlaces(q: string, signal?: AbortSignal): Promise<PlaceHit[]> {
  if (q.trim().length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=6&language=en&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Place search is unavailable right now");
  const json = (await res.json()) as { results?: PlaceHit[] };
  return json.results ?? [];
}

export type DayWeather = { code: number; max: number; min: number; rain: number | null };

export type WeatherIcon = "Sun" | "CloudSun" | "Cloud" | "Fog" | "Rain" | "Snow" | "Storm";

const WMO: [number[], WeatherIcon, string][] = [
  [[0], "Sun", "Clear"],
  [[1, 2], "CloudSun", "Partly cloudy"],
  [[3], "Cloud", "Overcast"],
  [[45, 48], "Fog", "Fog"],
  [[51, 53, 55, 56, 57], "Rain", "Drizzle"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "Rain", "Rain"],
  [[71, 73, 75, 77, 85, 86], "Snow", "Snow"],
  [[95, 96, 99], "Storm", "Thunderstorm"],
];

export function weatherLabel(code: number) {
  const hit = WMO.find(([codes]) => codes.includes(code));
  return { icon: (hit?.[1] ?? "Cloud") as WeatherIcon, label: hit?.[2] ?? "Weather" };
}

type Forecast = Record<string, DayWeather>;
const inflight = new Map<string, Promise<Forecast | null>>();

/** One request per location per page load, plus a 3h localStorage cache. */
function getForecast(lat: number, lon: number): Promise<Forecast | null> {
  const key = `waypoint:wx:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = inflight.get(key);
  if (hit) return hit;
  const p = (async () => {
    try {
      const c = JSON.parse(localStorage.getItem(key) ?? "null") as { at: number; days: Forecast } | null;
      if (c && Date.now() - c.at < 3 * 3600_000) return c.days;
    } catch {}
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=16`;
      const r = await fetch(url);
      if (!r.ok) return null;
      const j = await r.json();
      const d = j.daily as {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: (number | null)[];
      };
      const days: Forecast = {};
      d.time.forEach((t, i) => {
        days[t] = {
          code: d.weather_code[i],
          max: Math.round(d.temperature_2m_max[i]),
          min: Math.round(d.temperature_2m_min[i]),
          rain: d.precipitation_probability_max[i],
        };
      });
      try {
        localStorage.setItem(key, JSON.stringify({ at: Date.now(), days }));
      } catch {}
      return days;
    } catch {
      return null;
    }
  })();
  inflight.set(key, p);
  return p;
}

/** Daily forecast (next 16 days) for one place. */
export function useForecast(lat?: number, lon?: number) {
  const [data, setData] = useState<Forecast | null>(null);
  useEffect(() => {
    if (lat === undefined || lon === undefined) return;
    let alive = true;
    getForecast(lat, lon).then((f) => alive && setData(f));
    return () => {
      alive = false;
    };
  }, [lat, lon]);
  return data;
}

/** Which destination the group is in on a given date. */
export function destinationOn(trip: Trip, date: string): Destination | undefined {
  const planned = trip.destinations.filter((d) => d.status === "planned" && d.arrive);
  const inRange = planned.filter((d) => d.arrive <= date && (!d.depart || date <= d.depart));
  if (inRange.length) return inRange[inRange.length - 1]; // later arrival wins on travel days
  return planned.filter((d) => d.arrive <= date).sort((a, b) => a.arrive.localeCompare(b.arrive)).pop();
}

/** Caption for each trip day: where the group is (for date pickers). */
export function whereEachDay(trip: Trip, days: string[], excludeId?: string): Record<string, string> {
  const t = excludeId ? { ...trip, destinations: trip.destinations.filter((d) => d.id !== excludeId) } : trip;
  const out: Record<string, string> = {};
  for (const d of days) {
    const dest = t.destinations.filter((x) => x.status === "planned" && x.arrive && x.arrive <= d && (!x.depart || d <= x.depart));
    if (dest.length) out[d] = dest.map((x) => x.name).join(" / ");
  }
  return out;
}

/** Sensible dates for a new stop: start where the last planned stop ends, run to the end of the trip. */
export function suggestStopDates(trip: Trip): { arrive: string; depart: string } {
  const last = trip.destinations
    .filter((d) => d.status === "planned" && d.depart)
    .sort((a, b) => a.depart.localeCompare(b.depart))
    .pop();
  const arrive = last && last.depart < trip.endDate ? last.depart : trip.startDate;
  return { arrive, depart: trip.endDate };
}
