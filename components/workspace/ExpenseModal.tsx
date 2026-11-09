"use client";

import { useState } from "react";
import { whereEachDay } from "../../lib/places";
import { updateTrip } from "../../lib/store";
import type { Expense, Trip } from "../../lib/types";
import { CURRENCIES, addDays, cx, eachDay, fmtMoney, randomId, todayIso } from "../../lib/util";
import { Icon } from "../icons";
import { Avatar, Button, CategoryPicker, DayPicker, Field, Modal, inputCls } from "../ui";

export default function ExpenseModal({ trip, me, initial, onClose }: { trip: Trip; me?: string; initial?: Expense; onClose: () => void }) {
  const everyone = trip.members.map((m) => m.id);
  const days = eachDay(trip.startDate, trip.endDate);
  const today = todayIso();
  const [e, setE] = useState<Expense>(
    () =>
      initial ?? {
        id: randomId(8),
        title: "",
        amount: 0,
        currency: trip.currency,
        category: "food",
        // During the trip, default to today; before it, it's probably a deposit paid today.
        date: today <= trip.endDate ? today : trip.startDate,
        paidBy: me && everyone.includes(me) ? me : everyone[0],
        splitAmong: everyone,
      },
  );
  const set = <K extends keyof Expense>(k: K, v: Expense[K]) => setE((p) => ({ ...p, [k]: v }));
  const valid = e.title.trim() && e.amount > 0 && e.splitAmong.length > 0 && e.paidBy;
  const beforeTrip = Boolean(e.date) && e.date < trip.startDate;
  const toggle = (id: string) => set("splitAmong", e.splitAmong.includes(id) ? e.splitAmong.filter((x) => x !== id) : [...e.splitAmong, id]);
  const each = e.splitAmong.length ? e.amount / e.splitAmong.length : 0;

  function save() {
    if (!valid) return;
    const clean = { ...e, title: e.title.trim() };
    updateTrip(trip.id, (t) => {
      const i = t.expenses.findIndex((x) => x.id === clean.id);
      if (i >= 0) t.expenses[i] = clean;
      else t.expenses.push(clean);
    });
    onClose();
  }

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={initial ? "Edit expense" : "Log an expense"}
      footer={
        <>
          {initial ? (
            <Button
              variant="danger"
              icon="Trash"
              className="mr-auto"
              onClick={() => {
                updateTrip(trip.id, (t) => (t.expenses = t.expenses.filter((x) => x.id !== e.id)));
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
        onSubmit={(ev) => {
          ev.preventDefault();
          save();
        }}
      >
        <div className="grid grid-cols-[1fr_auto] items-end gap-3 sm:grid-cols-[1.6fr_1fr_auto]">
          <Field label="What was it for?" className="col-span-2 sm:col-span-1">
            {(id) => <input id={id} autoFocus className={inputCls} value={e.title} maxLength={100} placeholder="e.g. Dinner at Forodhani" onChange={(ev) => set("title", ev.target.value)} />}
          </Field>
          <Field label="Amount">
            {(id) => (
              <input
                id={id}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                className={cx(inputCls, "font-display text-lg font-bold")}
                value={e.amount || ""}
                onChange={(ev) => set("amount", Math.max(0, Number(ev.target.value) || 0))}
              />
            )}
          </Field>
          <div>
            <label className="sr-only" htmlFor="exp-cur">
              Currency
            </label>
            <select id="exp-cur" className={cx(inputCls, "w-24")} value={e.currency} onChange={(ev) => set("currency", ev.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold">Type</p>
          <CategoryPicker value={e.category} onChange={(c) => set("category", c)} />
        </div>

        <div>
          <DayPicker label="When?" days={days} mode="single" start={beforeTrip ? "" : e.date} onChange={(d) => set("date", d)} marks={whereEachDay(trip, days)} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => set("date", today < trip.startDate ? today : addDays(trip.startDate, -1))}
              aria-pressed={beforeTrip}
              className={cx(
                "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold",
                beforeTrip ? "border-accent bg-accent-soft text-accent" : "border-line hover:border-ink/30",
              )}
            >
              <Icon.Clock className="size-4" /> Before the trip (deposits, tickets)
            </button>
            {beforeTrip ? (
              <>
                <label className="sr-only" htmlFor="exp-date">
                  Date paid
                </label>
                <input id="exp-date" type="date" max={trip.startDate} className={cx(inputCls, "w-44")} value={e.date} onChange={(ev) => ev.target.value && set("date", ev.target.value)} />
              </>
            ) : null}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold">Who paid?</p>
          <div className="flex flex-wrap gap-2">
            {trip.members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => set("paidBy", m.id)}
                aria-pressed={e.paidBy === m.id}
                className={cx(
                  "inline-flex min-h-10 items-center gap-2 rounded-full border py-1 pr-3.5 pl-1 text-sm font-semibold transition",
                  e.paidBy === m.id ? "border-accent bg-accent-soft" : "border-line hover:border-ink/30",
                )}
              >
                <Avatar m={m} size={28} />
                {m.name}
                {m.id === me ? <span className="text-xs font-normal text-muted">(you)</span> : null}
              </button>
            ))}
          </div>
        </div>

        <fieldset>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <legend className="text-[13px] font-semibold">Split equally between</legend>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="ghost" onClick={() => set("splitAmong", everyone)}>
                Everyone
              </Button>
              {trip.families.map((f) => (
                <Button key={f.id} size="sm" variant="ghost" onClick={() => set("splitAmong", trip.members.filter((m) => m.familyId === f.id).map((m) => m.id))}>
                  {f.name}
                </Button>
              ))}
              {me ? (
                <Button size="sm" variant="ghost" onClick={() => set("splitAmong", [me])}>
                  Just me
                </Button>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {trip.members.map((m) => {
              const on = e.splitAmong.includes(m.id);
              return (
                <label
                  key={m.id}
                  className={cx(
                    "flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border px-2.5 text-sm font-semibold transition",
                    on ? "border-accent bg-accent-soft" : "border-line text-muted",
                  )}
                >
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(m.id)} />
                  <Avatar m={m} size={26} />
                  <span className="truncate">{m.name}</span>
                  <span className={cx("ml-auto grid size-5 place-items-center rounded-full", on ? "bg-accent text-accent-ink" : "border-2 border-line")}>
                    {on ? <Icon.Check className="size-3.5" strokeWidth={3} /> : null}
                  </span>
                </label>
              );
            })}
          </div>
          {e.splitAmong.length && e.amount ? (
            <p className="mt-2 text-sm text-muted">
              {e.splitAmong.length === 1 ? "One person covers it all." : `${fmtMoney(each, e.currency)} each, ${e.splitAmong.length} ways`}
            </p>
          ) : !e.splitAmong.length ? (
            <p className="mt-2 text-sm text-coral">Pick at least one person.</p>
          ) : null}
        </fieldset>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
