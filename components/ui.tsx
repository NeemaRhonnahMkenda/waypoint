"use client";

import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { weatherLabel, type DayWeather } from "../lib/places";
import { CATEGORY_LABEL, type Category, type Member } from "../lib/types";
import { addDays, cx, daysBetween, fmtDate, initials } from "../lib/util";
import { Icon, type IconName } from "./icons";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/* ---------- buttons ---------- */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "sun";
  size?: "sm" | "md";
  icon?: IconName;
};

export function Button({ variant = "secondary", size = "md", icon, className, children, ...rest }: BtnProps) {
  const Ic = icon ? Icon[icon] : null;
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
        size === "md" ? "min-h-11 px-5 text-sm" : "min-h-9 px-3.5 text-[13px]",
        variant === "primary" && "bg-accent text-accent-ink shadow-[0_2px_0_0_rgba(0,0,0,0.12)] hover:brightness-110",
        variant === "sun" && "bg-sun text-ink shadow-[0_2px_0_0_rgba(0,0,0,0.12)] hover:brightness-105",
        variant === "secondary" && "border border-line bg-card hover:border-ink/40",
        variant === "ghost" && "text-muted hover:bg-sunk hover:text-ink",
        variant === "danger" && "border border-line bg-card text-[var(--critical)] hover:border-[var(--critical)]",
        focus,
        className,
      )}
    >
      {Ic ? <Ic className={size === "md" ? "size-[18px]" : "size-4"} /> : null}
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  const Ic = Icon[icon];
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        "grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-sunk hover:text-ink disabled:opacity-30",
        focus,
        className,
      )}
    >
      <Ic className="size-[18px]" />
    </button>
  );
}

/* ---------- form fields ---------- */

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  children: (id: string) => React.ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </label>
      {children(id)}
      {hint ? <div className="text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

export const inputCls =
  "min-h-11 w-full rounded-xl border border-line bg-card px-3.5 text-[15px] outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/15";

/** Pill-style choice between a few options (radio semantics). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-full bg-sunk p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "min-h-9 rounded-full px-4 text-sm font-semibold transition",
            value === o.value ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink",
            focus,
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- surfaces ---------- */

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cx("rounded-[1.75rem] border border-line bg-card shadow-[0_1px_0_rgba(27,42,42,0.04)]", className)}>{children}</div>;
}

export function SectionTitle({ title, action, sub }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        {sub ? <p className="mt-0.5 text-sm text-muted">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Empty({
  icon,
  title,
  body,
  action,
  tone = "accent",
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: React.ReactNode;
  tone?: Tone;
}) {
  const Ic = Icon[icon];
  return (
    <div className="flex flex-col items-center rounded-[1.75rem] border-2 border-dashed border-line px-6 py-10 text-center">
      <span className={cx("grid size-14 place-items-center rounded-2xl", TONE[tone])}>
        <Ic className="size-7" />
      </span>
      <p className="mt-4 font-display text-lg font-bold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

type Tone = "neutral" | "accent" | "coral" | "sun" | "sky" | "plum";
const TONE: Record<Tone, string> = {
  neutral: "bg-sunk text-muted",
  accent: "bg-accent-soft text-accent",
  coral: "bg-coral-soft text-coral",
  sun: "bg-sun-soft text-[#8a5a00]",
  sky: "bg-sky-soft text-sky",
  plum: "bg-plum-soft text-plum",
};

export function Pill({ children, tone = "neutral", icon }: { children: React.ReactNode; tone?: Tone; icon?: IconName }) {
  const Ic = icon ? Icon[icon] : null;
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", TONE[tone])}>
      {Ic ? <Ic className="size-3.5" strokeWidth={2.2} /> : null}
      {children}
    </span>
  );
}

/* ---------- categories & weather ---------- */

export const CATEGORY_META: Record<Category, { icon: IconName; tone: Tone }> = {
  stay: { icon: "Bed", tone: "plum" },
  transport: { icon: "Bus", tone: "sky" },
  food: { icon: "Utensils", tone: "coral" },
  activities: { icon: "Ticket", tone: "accent" },
  shopping: { icon: "Bag", tone: "sun" },
  other: { icon: "Dot", tone: "neutral" },
};

export function CatIcon({ c, size = "md" }: { c: Category; size?: "sm" | "md" }) {
  const m = CATEGORY_META[c];
  const Ic = Icon[m.icon];
  return (
    <span
      title={CATEGORY_LABEL[c]}
      className={cx("grid shrink-0 place-items-center rounded-xl", TONE[m.tone], size === "md" ? "size-10" : "size-8")}
    >
      <Ic className={size === "md" ? "size-5" : "size-4"} />
      <span className="sr-only">{CATEGORY_LABEL[c]}</span>
    </span>
  );
}

/** Category chooser as tappable tiles instead of a dropdown. */
export function CategoryPicker({ value, onChange }: { value: Category; onChange: (c: Category) => void }) {
  return (
    <div role="radiogroup" aria-label="Type" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          onClick={() => onChange(c)}
          className={cx(
            "flex flex-col items-center gap-1.5 rounded-2xl border p-2 text-xs font-semibold transition",
            value === c ? "border-accent bg-accent-soft/60" : "border-line hover:border-ink/30",
            focus,
          )}
        >
          <CatIcon c={c} size="sm" />
          {CATEGORY_LABEL[c]}
        </button>
      ))}
    </div>
  );
}

export function WeatherBadge({ wx }: { wx: DayWeather }) {
  const { icon, label } = weatherLabel(wx.code);
  const Ic = Icon[icon];
  const warm = icon === "Sun" || icon === "CloudSun";
  return (
    <div className={cx("flex items-center gap-2.5 rounded-2xl px-3 py-2 text-sm", warm ? "bg-sun-soft" : "bg-sky-soft")} title={label}>
      <Ic className={cx("size-6", warm ? "text-[#c98500]" : "text-sky")} />
      <span>
        <span className="font-semibold">
          {wx.max}° <span className="font-normal text-muted">/ {wx.min}°</span>
        </span>
        <span className="block text-xs text-muted">
          {label}
          {wx.rain !== null && wx.rain > 0 ? ` · ${wx.rain}% rain` : ""}
        </span>
      </span>
    </div>
  );
}

/* ---------- people ---------- */

export function Avatar({ m, size = 32 }: { m: Pick<Member, "name" | "color">; size?: number }) {
  return (
    <span
      title={m.name}
      className="inline-grid shrink-0 place-items-center rounded-full font-bold text-white ring-2 ring-card"
      style={{ background: m.color, width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(m.name)}
    </span>
  );
}

export function AvatarStack({ members, max = 5 }: { members: Member[]; max?: number }) {
  return (
    <span className="flex items-center">
      {members.slice(0, max).map((m, i) => (
        <span key={m.id} className={i ? "-ml-2" : ""}>
          <Avatar m={m} size={28} />
        </span>
      ))}
      {members.length > max ? <span className="ml-2 text-xs text-muted">+{members.length - max}</span> : null}
    </span>
  );
}

/* ---------- day picker: only ever shows the trip's own days ---------- */

export function DayPicker({
  days,
  mode,
  start,
  end,
  onChange,
  marks,
  nights = false,
  label,
}: {
  days: string[];
  mode: "single" | "range";
  start: string;
  end?: string;
  onChange: (start: string, end: string) => void;
  /** Small caption under a day, e.g. where the group is that day. */
  marks?: Record<string, string>;
  /** Range counts nights (hotel style): start and end can't be the same day. */
  nights?: boolean;
  label: string;
}) {
  const [anchor, setAnchor] = useState<string | null>(null);
  const e = end || start;

  function pick(d: string) {
    if (mode === "single") return onChange(d, d);
    if (!anchor) {
      setAnchor(d);
      const i = days.indexOf(d);
      onChange(d, nights ? days[i + 1] ?? d : d);
      return;
    }
    let s = anchor < d ? anchor : d;
    let t = anchor < d ? d : anchor;
    if (nights && s === t) t = days[days.indexOf(s) + 1] ?? t;
    if (nights && s === t) s = days[days.indexOf(t) - 1] ?? s;
    setAnchor(null);
    onChange(s, t);
  }

  // Group by month so long trips stay readable.
  const months: { key: string; days: string[] }[] = [];
  for (const d of days) {
    const k = d.slice(0, 7);
    if (months.at(-1)?.key !== k) months.push({ key: k, days: [] });
    months.at(-1)!.days.push(d);
  }

  const n = mode === "range" && start && e ? daysBetween(start, e) : 0;
  const summary =
    mode === "single"
      ? start
        ? fmtDate(start, { weekday: "long", day: "numeric", month: "long" })
        : "Pick a day"
      : start
        ? `${fmtDate(start, { weekday: "short", day: "numeric", month: "short" })}${e !== start ? ` → ${fmtDate(e, { weekday: "short", day: "numeric", month: "short" })}` : ""} · ${
            nights ? `${n} night${n === 1 ? "" : "s"}` : `${n + 1} day${n === 0 ? "" : "s"}`
          }`
        : "Pick the first day";

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold">{label}</span>
        <span className="text-xs font-medium text-accent" aria-live="polite">
          {anchor ? "Now tap the last day" : summary}
        </span>
      </div>
      {months.map((m) => (
        <div key={m.key} className="mb-2">
          {months.length > 1 ? (
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
              {fmtDate(m.key + "-01", { month: "long", year: "numeric" })}
            </p>
          ) : null}
          <div role="group" aria-label={label} className="grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-1.5">
            {m.days.map((d) => {
              const isStart = d === start;
              const isEnd = mode === "range" && d === e;
              const inRange = mode === "range" && start && d > start && d < e;
              const sel = isStart || isEnd;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => pick(d)}
                  aria-pressed={Boolean(sel || inRange)}
                  aria-label={`${fmtDate(d, { weekday: "long", day: "numeric", month: "long" })}${marks?.[d] ? `, ${marks[d]}` : ""}`}
                  className={cx(
                    "flex min-h-14 flex-col items-center justify-center rounded-xl border px-1 py-1.5 transition",
                    sel
                      ? "border-accent bg-accent text-accent-ink"
                      : inRange
                        ? "border-accent/20 bg-accent-soft text-ink"
                        : "border-line bg-card hover:border-accent/50",
                    anchor === d && "ring-4 ring-sun/50",
                    focus,
                  )}
                >
                  <span className={cx("text-[10px] font-semibold uppercase", sel ? "opacity-80" : "text-muted")}>
                    {fmtDate(d, { weekday: "short" })}
                  </span>
                  <span className="font-display text-lg font-bold leading-none">{fmtDate(d, { day: "numeric" })}</span>
                  {marks?.[d] ? (
                    <span className={cx("mt-0.5 max-w-full truncate text-[10px] leading-tight", sel ? "opacity-85" : "text-muted")}>
                      {marks[d]}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Days for a hotel-style picker: the trip, plus the morning after (check-out day). */
export function stayDays(tripDays: string[]) {
  return tripDays.length ? [...tripDays, addDays(tripDays.at(-1)!, 1)] : tripDays;
}

/* ---------- modal (native <dialog>: focus trap + Esc for free) ---------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx(
        "m-0 mt-auto max-h-[94dvh] w-full max-w-none rounded-t-[1.75rem] border border-line bg-card p-0 text-ink shadow-2xl backdrop:bg-[#1b2a2a]/35 backdrop:backdrop-blur-[3px] sm:m-auto sm:rounded-[1.75rem]",
        wide ? "sm:max-w-2xl" : "sm:max-w-lg",
      )}
    >
      {open ? (
        <div className="flex max-h-[94dvh] flex-col">
          <div className="flex items-center justify-between gap-4 px-5 pt-5 pb-3">
            <h2 className="font-display text-xl font-bold">{title}</h2>
            <IconButton icon="X" label="Close" onClick={onClose} />
          </div>
          <div className="overflow-y-auto px-5 pb-5">{children}</div>
          {footer ? (
            <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-paper/60 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}

/* ---------- copy-to-clipboard ---------- */

export function CopyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <div className="flex gap-2">
          <input id={id} readOnly value={value} className={cx(inputCls, "font-mono text-xs")} onFocus={(e) => e.target.select()} />
          <Button
            icon={copied ? "Check" : "Copy"}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(value);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              } catch {}
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      )}
    </Field>
  );
}

/* ---------- read-only context ---------- */

export const ReadOnlyCtx = createContext(false);
export const useReadOnly = () => useContext(ReadOnlyCtx);
