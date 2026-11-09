"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { blankTrip, putLocalTrip } from "@/lib/store";
import { CURRENCIES, addDays, todayIso } from "@/lib/util";
import TripDates from "./TripDates";
import { Button, Field, Modal, inputCls } from "./ui";

export default function NewTrip({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [you, setYou] = useState("");
  const [start, setStart] = useState(() => addDays(todayIso(), 30));
  const [end, setEnd] = useState(() => addDays(todayIso(), 34));
  const [currency, setCurrency] = useState("KES");

  const valid = name.trim() && you.trim() && start && end && end >= start;

  function create(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid) return;
    const lt = blankTrip({ name, startDate: start, endDate: end, currency, yourName: you });
    putLocalTrip(lt);
    onClose();
    router.push(`/trips/${lt.trip.id}`);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Where to next?"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon="Check" disabled={!valid} onClick={() => create()}>
            Create trip
          </Button>
        </>
      }
    >
      <form onSubmit={create} className="grid gap-5">
        <Field label="Name your trip">
          {(id) => (
            <input id={id} className={inputCls} placeholder="e.g. Diani with the cousins" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus />
          )}
        </Field>
        <TripDates
          start={start}
          end={end}
          onChange={(s, e) => {
            setStart(s);
            setEnd(e);
          }}
        />
        <div className="grid grid-cols-[1.4fr_1fr] gap-3">
          <Field label="Your name" hint="Your group joins later from a link.">
            {(id) => <input id={id} className={inputCls} value={you} onChange={(e) => setYou(e.target.value)} maxLength={40} placeholder="e.g. Neema" />}
          </Field>
          <Field label="Budget in">
            {(id) => (
              <select id={id} className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
