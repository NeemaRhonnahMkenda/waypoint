"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Balance } from "../lib/money";
import { CATEGORIES, CATEGORY_LABEL, type Category } from "../lib/types";
import { Icon } from "./icons";
import { CatIcon } from "./ui";
import { fmtDate, fmtMoney } from "../lib/util";

/*
 * Chart rules (from the data-viz method):
 *  - single-series charts: no legend, the heading names the series
 *  - one validated hue (--series-1); diverging uses --series-1 / --series-neg around a neutral zero
 *  - values are always printed as text too, so colour never carries meaning alone
 *  - status colour (--critical) only for "over budget", always with an icon + words
 */

const axis = { fontSize: 12, fill: "var(--muted)" };

function TipBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2 text-sm shadow-lg">
      <p className="font-medium">{title}</p>
      {lines.map((l) => (
        <p key={l} className="text-muted">
          {l}
        </p>
      ))}
    </div>
  );
}

/** Budget vs spent per category. Plain HTML bars: readable, accessible, no chart lib needed. */
export function CategoryBars({
  budget,
  spent,
  committed,
  currency,
}: {
  budget: Record<Category, number>;
  spent: Record<Category, number>;
  committed: Record<Category, number>;
  currency: string;
}) {
  const rows = CATEGORIES.filter((c) => budget[c] || spent[c] || committed[c]);
  const max = Math.max(1, ...rows.map((c) => Math.max(budget[c] || 0, spent[c] || 0)));
  if (!rows.length) return <p className="text-sm text-muted">Set a budget or log an expense to see this.</p>;

  return (
    <ul className="grid gap-4">
      {rows.map((c) => {
        const b = budget[c] || 0;
        const s = spent[c] || 0;
        const over = b > 0 && s > b;
        return (
          <li key={c}>
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="inline-flex items-center gap-2 font-semibold">
                <CatIcon c={c} size="sm" /> {CATEGORY_LABEL[c]}
              </span>
              <span className="text-muted">
                <span className="font-medium text-ink">{fmtMoney(s, currency, true)}</span>
                {b ? ` of ${fmtMoney(b, currency, true)}` : " · no budget set"}
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-[var(--chart-track)]" role="img" aria-label={`${CATEGORY_LABEL[c]}: spent ${fmtMoney(s, currency)}${b ? ` of ${fmtMoney(b, currency)}` : ""}`}>
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${Math.max(s ? 1.5 : 0, (s / max) * 100)}%`, background: over ? "var(--critical)" : "var(--series-1)" }}
              />
              {b ? (
                <span
                  className="absolute -top-1 -bottom-1 w-0.5 rounded bg-ink"
                  style={{ left: `calc(${(b / max) * 100}% - 1px)` }}
                  title={`Budget ${fmtMoney(b, currency)}`}
                  aria-hidden
                />
              ) : null}
            </div>
            {over ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[var(--critical)]"><Icon.Alert className="size-3.5" /> Over by {fmtMoney(s - b, currency)}</p>
            ) : committed[c] ? (
              <p className="mt-1 text-xs text-muted">+ {fmtMoney(committed[c], currency, true)} committed in plans</p>
            ) : null}
          </li>
        );
      })}
      <li className="flex items-center gap-4 pt-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-[var(--series-1)]" /> Spent
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-0.5 rounded bg-ink" /> Budget
        </span>
      </li>
    </ul>
  );
}

export function SpendByDay({ data, currency }: { data: { date: string; amount: number }[]; currency: string }) {
  if (!data.length) return <p className="text-sm text-muted">Expenses with a date will show up here.</p>;
  const rows = data.map((d) => ({ ...d, label: fmtDate(d.date) }));
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: "var(--line)" }} />
          <YAxis tick={axis} tickLine={false} axisLine={false} width={84} tickFormatter={(v: number) => fmtMoney(v, currency, true)} />
          <Tooltip
            cursor={{ fill: "var(--sunk)" }}
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <TipBox
                  title={fmtDate(String(payload[0].payload.date), { weekday: "short", day: "numeric", month: "short" })}
                  lines={[fmtMoney(Number(payload[0].value), currency)]}
                />
              ) : null
            }
          />
          <Bar dataKey="amount" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Diverging bars: right (blue) = is owed money, left (red) = owes money. */
export function BalanceChart({ data, currency }: { data: Balance[]; currency: string }) {
  const rows = data.map((b) => ({ ...b, net: Math.round(b.net) }));
  const h = Math.max(140, rows.length * 44 + 30);
  return (
    <div style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid horizontal={false} stroke="var(--line)" />
          <XAxis type="number" tick={axis} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtMoney(v, currency, true)} />
          <YAxis type="category" dataKey="name" tick={{ ...axis, fill: "var(--ink)" }} tickLine={false} axisLine={false} width={96} />
          <ReferenceLine x={0} stroke="var(--muted)" />
          <Tooltip
            cursor={{ fill: "var(--sunk)" }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as Balance | undefined;
              if (!active || !p) return null;
              return (
                <TipBox
                  title={p.name}
                  lines={[
                    `Paid ${fmtMoney(p.paid, currency)}`,
                    `Share ${fmtMoney(p.share, currency)}`,
                    p.net >= 0 ? `Is owed ${fmtMoney(p.net, currency)}` : `Owes ${fmtMoney(-p.net, currency)}`,
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="net" radius={4} maxBarSize={22}>
            {rows.map((r) => (
              <Cell key={r.id} fill={r.net >= 0 ? "var(--series-1)" : "var(--series-neg)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
