"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cloneAsNew, deleteLocalTrip, patchLocal, putLocalTrip, updateTrip } from "@/lib/store";
import { downloadTrip } from "@/lib/shareClient";
import type { LocalTrip, Member } from "@/lib/types";
import { CURRENCIES, MEMBER_COLORS, addDays, daysBetween, fmtRange, randomId } from "@/lib/util";
import { Icon } from "../icons";
import TripDates from "../TripDates";
import { Avatar, Button, Card, Field, IconButton, Modal, Pill, SectionTitle, inputCls, useReadOnly } from "../ui";

export default function Group({ lt, openShare }: { lt: LocalTrip; openShare: () => void }) {
  const { trip } = lt;
  const ro = useReadOnly();
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [newFamily, setNewFamily] = useState("");
  const [datesOpen, setDatesOpen] = useState(false);

  const unassigned = trip.members.filter((m) => !m.familyId || !trip.families.some((f) => f.id === m.familyId));

  function addMember() {
    const n = newName.trim();
    if (!n) return;
    updateTrip(trip.id, (t) =>
      t.members.push({ id: randomId(8), name: n, color: MEMBER_COLORS[t.members.length % MEMBER_COLORS.length], familyId: null }),
    );
    setNewName("");
  }

  function addFamily() {
    const n = newFamily.trim();
    if (!n) return;
    updateTrip(trip.id, (t) => t.families.push({ id: randomId(6), name: n }));
    setNewFamily("");
  }

  function removeMember(m: Member) {
    if (trip.expenses.some((e) => e.paidBy === m.id)) {
      alert(`${m.name} paid for some expenses. Reassign or delete those first.`);
      return;
    }
    if (!confirm(`Remove ${m.name} from the trip?`)) return;
    updateTrip(trip.id, (t) => {
      t.members = t.members.filter((x) => x.id !== m.id);
      t.expenses.forEach((e) => (e.splitAmong = e.splitAmong.filter((x) => x !== m.id)));
      t.expenses = t.expenses.filter((e) => e.splitAmong.length > 0);
      t.destinations.forEach((d) => (d.votes = d.votes.filter((v) => v !== m.id)));
      t.stays.forEach((s) => (s.votes = s.votes.filter((v) => v !== m.id)));
    });
  }

  const memberRow = (m: Member) => (
    <li key={m.id} className="flex items-center gap-3 py-2.5">
      <Avatar m={m} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          {m.name} {m.id === lt.me ? <Pill tone="accent">You</Pill> : null}
        </span>
      </span>
      {ro ? null : (
        <>
          <label className="sr-only" htmlFor={`fam-${m.id}`}>
            Family for {m.name}
          </label>
          <select
            id={`fam-${m.id}`}
            value={m.familyId ?? ""}
            onChange={(e) => updateTrip(trip.id, (t) => (t.members.find((x) => x.id === m.id)!.familyId = e.target.value || null))}
            className="min-h-9 max-w-36 rounded-full border border-line bg-card px-3 text-[13px]"
          >
            <option value="">No family</option>
            {trip.families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <IconButton icon="Trash" label={`Remove ${m.name}`} onClick={() => removeMember(m)} className="hover:text-[var(--critical)]" />
        </>
      )}
    </li>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="grid content-start gap-6">
        <Card className="p-5 sm:p-6">
          <SectionTitle title="Travellers" sub="Group people into families to split costs per household." />

          {trip.families.map((f) => {
            const ms = trip.members.filter((m) => m.familyId === f.id);
            return (
              <div key={f.id} className="mb-4 rounded-2xl border border-line p-4">
                <div className="flex items-center justify-between gap-2">
                  {ro ? (
                    <h3 className="font-display font-semibold">{f.name}</h3>
                  ) : (
                    <input
                      aria-label="Family name"
                      defaultValue={f.name}
                      key={f.name}
                      maxLength={40}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== f.name) updateTrip(trip.id, (t) => (t.families.find((x) => x.id === f.id)!.name = v));
                      }}
                      className="min-w-0 flex-1 rounded-lg bg-transparent font-display font-semibold outline-none focus:bg-sunk focus:px-2"
                    />
                  )}
                  <span className="text-xs text-muted">{ms.length} people</span>
                  {ro ? null : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        updateTrip(trip.id, (t) => {
                          t.families = t.families.filter((x) => x.id !== f.id);
                          t.members.forEach((m) => m.familyId === f.id && (m.familyId = null));
                        })
                      }
                    >
                      Remove
                    </Button>
                  )}
                </div>
                {ms.length ? (
                  <ul className="mt-1 divide-y divide-line">
                    {ms.map((m) => (
                      memberRow(m)
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted">Assign people below.</p>
                )}
              </div>
            );
          })}

          {unassigned.length ? (
            <div>
              {trip.families.length ? <h3 className="mb-1 text-sm font-medium text-muted">Not in a family</h3> : null}
              <ul className="divide-y divide-line">
                {unassigned.map((m) => (
                  memberRow(m)
                ))}
              </ul>
            </div>
          ) : null}

          {ro ? null : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  addMember();
                }}
              >
                <label htmlFor="add-member" className="sr-only">
                  Add a person
                </label>
                <input id="add-member" className={inputCls} placeholder="Add a person" value={newName} maxLength={40} onChange={(e) => setNewName(e.target.value)} />
                <Button type="submit" icon="Plus" disabled={!newName.trim()}>
                  Add
                </Button>
              </form>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  addFamily();
                }}
              >
                <label htmlFor="add-family" className="sr-only">
                  Add a family
                </label>
                <input id="add-family" className={inputCls} placeholder="New family, e.g. The Ochiengs" value={newFamily} maxLength={40} onChange={(e) => setNewFamily(e.target.value)} />
                <Button type="submit" icon="Plus" disabled={!newFamily.trim()}>
                  Add
                </Button>
              </form>
            </div>
          )}
        </Card>

        {ro ? null : (
          <Card className="p-5 sm:p-6">
            <SectionTitle title="Trip details" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Trip name" className="sm:col-span-2">
                {(id) => (
                  <input
                    id={id}
                    className={inputCls}
                    defaultValue={trip.name}
                    key={trip.name}
                    maxLength={80}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== trip.name) updateTrip(trip.id, (t) => (t.name = v));
                    }}
                  />
                )}
              </Field>
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-[13px] font-semibold">Dates</p>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    <Icon.Calendar className="size-[18px] text-accent" /> {fmtRange(trip.startDate, trip.endDate)}
                  </span>
                  <Button size="sm" icon="Pencil" onClick={() => setDatesOpen(true)}>
                    Change dates
                  </Button>
                </div>
              </div>
              <Field label="Budget currency" hint="Everything is converted to this currency.">
                {(id) => (
                  <select id={id} className={inputCls} value={trip.currency} onChange={(e) => updateTrip(trip.id, (t) => (t.currency = e.target.value))}>
                    {CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
          </Card>
        )}
      </div>

      <div className="grid content-start gap-6">
        <Card className="p-5 sm:p-6">
          <SectionTitle title="You on this device" />
          <Field label="I am" hint="Used for your votes and as the default payer.">
            {(id) => (
              <select id={id} className={inputCls} value={lt.me ?? ""} onChange={(e) => patchLocal(trip.id, { me: e.target.value || undefined })}>
                <option value="">Choose…</option>
                {trip.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </Card>

        <Card className="p-5 sm:p-6">
          <SectionTitle title="Share & export" />
          <div className="grid gap-3">
            <Button variant="primary" icon="Share" onClick={openShare}>
              {lt.share ? "View share links" : "Share with your group"}
            </Button>
            <Link
              href={`/trips/${trip.id}/print`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-card px-5 text-sm font-semibold transition hover:border-ink/40"
            >
              <Icon.Printer className="size-[18px]" /> Printable itinerary
            </Link>
            <Button icon="Download" onClick={() => downloadTrip(trip)}>Download trip file</Button>
            <Button
              variant="ghost"
              icon="Copy"
              onClick={() => {
                const copy = cloneAsNew(trip, " (copy)");
                putLocalTrip(copy);
                router.push(`/trips/${copy.trip.id}`);
              }}
            >
              Duplicate trip
            </Button>
          </div>
        </Card>

        {datesOpen ? <DatesModal lt={lt} onClose={() => setDatesOpen(false)} /> : null}

        <Card className="p-5 sm:p-6">
          <SectionTitle title="Remove from this device" />
          <p className="mb-3 text-sm text-muted">
            {lt.share ? "The group's shared copy stays online; only this device forgets it." : "This deletes the trip permanently unless you've downloaded or shared it."}
          </p>
          <Button
            variant="danger"
            icon="Trash"
            onClick={() => {
              if (confirm(`Remove "${trip.name}" from this device?`)) {
                deleteLocalTrip(trip.id);
                router.push("/");
              }
            }}
          >
            Remove trip
          </Button>
        </Card>
      </div>
    </div>
  );
}

/**
 * Changing dates: keeps the same length by default and offers to move every plan,
 * stop, stay and in-trip expense by the same number of days, so nothing is stranded.
 */
function DatesModal({ lt, onClose }: { lt: LocalTrip; onClose: () => void }) {
  const { trip } = lt;
  const [start, setStart] = useState(trip.startDate);
  const [end, setEnd] = useState(trip.endDate);
  const shift = daysBetween(trip.startDate, start);
  const [moveAll, setMoveAll] = useState(true);
  const dated = trip.activities.length + trip.destinations.filter((d) => d.arrive).length + trip.stays.filter((s) => s.checkIn).length;
  const strandedIfNotMoved = trip.activities.filter((a) => a.date < start || a.date > end).length;

  function save() {
    const mv = (d: string) => (d ? addDays(d, shift) : d);
    updateTrip(trip.id, (t) => {
      if (moveAll && shift) {
        t.activities.forEach((a) => (a.date = mv(a.date)));
        t.destinations.forEach((d) => {
          d.arrive = mv(d.arrive);
          d.depart = mv(d.depart);
        });
        t.stays.forEach((s) => {
          s.checkIn = mv(s.checkIn);
          s.checkOut = mv(s.checkOut);
        });
        // Only move expenses that happened during the trip; deposits keep their real date.
        t.expenses.forEach((e) => e.date >= t.startDate && e.date <= t.endDate && (e.date = mv(e.date)));
      }
      t.startDate = start;
      t.endDate = end;
    });
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Change trip dates"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon="Check" disabled={!start || end < start} onClick={save}>
            Save dates
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        <TripDates
          start={start}
          end={end}
          onChange={(s, e) => {
            setStart(s);
            setEnd(e);
          }}
        />
        {shift && dated ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-sun-soft p-4">
            <input type="checkbox" className="mt-1 size-4 accent-[var(--accent)]" checked={moveAll} onChange={(e) => setMoveAll(e.target.checked)} />
            <span className="text-sm">
              <span className="block font-semibold">
                Move everything {Math.abs(shift)} day{Math.abs(shift) === 1 ? "" : "s"} {shift > 0 ? "later" : "earlier"}
              </span>
              Plans, stops and stays keep their place in the trip (day 1 stays day 1).
            </span>
          </label>
        ) : null}
        {(!moveAll || !shift) && strandedIfNotMoved ? (
          <p className="flex items-start gap-2 text-sm text-coral">
            <Icon.Alert className="mt-0.5 size-4 shrink-0" />
            {strandedIfNotMoved} plan{strandedIfNotMoved === 1 ? "" : "s"} will fall outside the new dates. You can move them from the Itinerary.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
