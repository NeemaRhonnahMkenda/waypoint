"use client";

import { useState } from "react";
import { suggestStopDates, whereEachDay } from "@/lib/places";
import { updateTrip } from "@/lib/store";
import type { Destination, Trip } from "@/lib/types";
import { eachDay } from "@/lib/util";
import { Icon } from "../icons";
import { Button, DayPicker, Field, Modal, Segmented, inputCls } from "../ui";

/** Add or edit a stop. New stops come pre-filled with sensible dates inside the trip. */
export default function DestinationModal({
  trip,
  initial,
  isNew,
  onClose,
}: {
  trip: Trip;
  initial: Destination;
  isNew?: boolean;
  onClose: () => void;
}) {
  const days = eachDay(trip.startDate, trip.endDate);
  const [d, setD] = useState<Destination>(() => {
    if (initial.status === "planned" && !initial.arrive && days.length) return { ...initial, ...suggestStopDates(trip) };
    return initial;
  });
  const marks = whereEachDay(trip, days, d.id);

  function setStatus(status: Destination["status"]) {
    setD((p) => (status === "planned" && !p.arrive && days.length ? { ...p, status, ...suggestStopDates(trip) } : { ...p, status }));
  }

  function save() {
    updateTrip(trip.id, (t) => {
      const i = t.destinations.findIndex((x) => x.id === d.id);
      if (i >= 0) t.destinations[i] = d;
      else t.destinations.push(d);
    });
    onClose();
  }

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={isNew ? `Add ${d.name}` : d.name}
      footer={
        <>
          {!isNew ? (
            <Button
              variant="danger"
              icon="Trash"
              className="mr-auto"
              onClick={() => {
                updateTrip(trip.id, (t) => {
                  t.destinations = t.destinations.filter((y) => y.id !== d.id);
                  t.stays.forEach((s) => s.destinationId === d.id && (s.destinationId = null));
                });
                onClose();
              }}
            >
              Remove
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon="Check" onClick={save}>
            {isNew ? "Add to trip" : "Save"}
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        <p className="flex items-center gap-2 text-sm text-muted">
          <Icon.Pin className="size-4 text-accent" /> {[d.name, d.country].filter(Boolean).join(", ")}
        </p>

        <Segmented
          label="Is this on the route?"
          value={d.status}
          onChange={setStatus}
          options={[
            { value: "planned", label: "On the route" },
            { value: "idea", label: "Just an idea for now" },
          ]}
        />

        {d.status === "planned" ? (
          days.length ? (
            <div>
              <DayPicker
                label={`When are you in ${d.name}?`}
                days={days}
                mode="range"
                start={d.arrive}
                end={d.depart}
                marks={marks}
                onChange={(arrive, depart) => setD((p) => ({ ...p, arrive, depart }))}
              />
              <p className="mt-1 text-xs text-muted">
                Tap the first day, then the last. Days already have the other stops written under them.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">Set the trip dates in Group to choose days here.</p>
          )
        ) : (
          <p className="rounded-2xl bg-sun-soft p-4 text-sm">
            Ideas sit to the side with dashed pins so everyone can vote. Move it onto the route whenever you decide.
          </p>
        )}

        <Field label="Notes">
          {(id) => (
            <textarea
              id={id}
              rows={2}
              className={`${inputCls} py-2.5`}
              value={d.notes}
              maxLength={1000}
              placeholder="Why go, what to see, who you're visiting…"
              onChange={(e) => setD((p) => ({ ...p, notes: e.target.value }))}
            />
          )}
        </Field>
      </div>
    </Modal>
  );
}
