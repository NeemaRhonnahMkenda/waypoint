/* Small shared helpers: ids, dates, money formatting. */

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Unbiased random base62 string using Web Crypto (works in browser and Node). */
export function randomId(length = 12): string {
  const out: string[] = [];
  const buf = new Uint8Array(length * 2);
  while (out.length < length) {
    crypto.getRandomValues(buf);
    for (const b of buf) {
      if (b < 248 && out.length < length) out.push(ALPHABET[b % 62]); // 248 = 62*4, avoids modulo bias
    }
  }
  return out.join("");
}

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/* ---------- dates (all ISO yyyy-mm-dd, treated as UTC to avoid TZ drift) ---------- */

export function parseDate(d: string): Date | null {
  if (!d) return null;
  const t = Date.parse(d + "T00:00:00Z");
  return Number.isNaN(t) ? null : new Date(t);
}

export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  const now = new Date();
  // local calendar date, not UTC, so "today" matches the user's wall clock
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export function addDays(iso: string, n: number): string {
  const d = parseDate(iso);
  if (!d) return iso;
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

export function daysBetween(a: string, b: string): number {
  const da = parseDate(a);
  const db = parseDate(b);
  if (!da || !db) return 0;
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

/** Every date from start to end inclusive (capped at 120 days). */
export function eachDay(start: string, end: string): string[] {
  if (!start || !end || end < start) return start ? [start] : [];
  const n = Math.min(daysBetween(start, end), 119);
  return Array.from({ length: n + 1 }, (_, i) => addDays(start, i));
}

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  const d = parseDate(iso);
  if (!d) return "";
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(d);
}

export function fmtRange(start: string, end: string) {
  if (!start) return "Dates not set";
  if (!end || end === start) return fmtDate(start, { day: "numeric", month: "short", year: "numeric" });
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${fmtDate(start, { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) })} – ${fmtDate(
    end,
    { day: "numeric", month: "short", year: "numeric" },
  )}`;
}

/* ---------- money ---------- */

export function fmtMoney(amount: number, currency: string, compact = false) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: compact || Math.abs(amount) >= 1000 ? 0 : 2,
      notation: compact && Math.abs(amount) >= 100_000 ? "compact" : "standard",
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString("en")}`;
  }
}

export const CURRENCIES = [
  "KES", "USD", "EUR", "GBP", "TZS", "UGX", "RWF", "ETB", "ZAR", "NGN", "GHS", "EGP", "MAD",
  "AED", "SAR", "INR", "CNY", "JPY", "THB", "SGD", "AUD", "CAD", "CHF", "SEK", "TRY",
];

/** 8 distinct, colour-blind-checked colours for member avatars. Always shown with a name. */
export const MEMBER_COLORS = [
  "#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948",
];

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}
