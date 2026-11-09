"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { cloneAsNew, patchLocal, putLocalTrip, updateTrip, useLocalTrip } from "@/lib/store";
import { useTripSync, type SyncState } from "@/lib/shareClient";
import { MEMBER_COLORS, cx, fmtRange, randomId } from "@/lib/util";
import { Icon } from "../icons";
import { Avatar, Button, Field, Modal, ReadOnlyCtx, inputCls } from "../ui";
import Overview from "./Overview";
import Itinerary from "./Itinerary";
import Places from "./Places";
import Budget from "./Budget";
import Group from "./Group";
import ShareCard from "./ShareCard";

const TABS = [
  { id: "overview", label: "Overview", icon: "Compass" },
  { id: "itinerary", label: "Itinerary", icon: "Calendar" },
  { id: "places", label: "Places & stays", icon: "Pin" },
  { id: "budget", label: "Budget", icon: "Wallet" },
  { id: "group", label: "Group", icon: "Users" },
] as const;
export type TabId = (typeof TABS)[number]["id"];

const SYNC_LABEL: Record<SyncState, { text: string; dot: string }> = {
  local: { text: "On this device", dot: "bg-muted" },
  view: { text: "View only", dot: "bg-muted" },
  synced: { text: "Synced with group", dot: "bg-[var(--good)]" },
  pending: { text: "Unsaved changes", dot: "bg-coral" },
  saving: { text: "Saving…", dot: "bg-coral animate-pulse" },
  conflict: { text: "Needs attention", dot: "bg-[var(--critical)]" },
  offline: { text: "Offline, will retry", dot: "bg-coral" },
};

export default function Workspace() {
  const { id } = useParams<{ id: string }>();
  const lt = useLocalTrip(id);
  const router = useRouter();
  const sync = useTripSync(lt);
  const [tab, setTab] = useState<TabId>("overview");
  const [sharing, setSharing] = useState(false);
  const [askWho, setAskWho] = useState(true);

  if (lt === undefined) {
    return <div className="mx-auto mt-24 h-64 w-full max-w-6xl animate-pulse rounded-3xl bg-sunk px-4" />;
  }
  if (lt === null) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-sun-soft text-[#8a5a00]">
          <Icon.Compass className="size-8" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold">Trip not found on this device</h1>
        <p className="mt-2 text-muted">If someone shared it with you, open the link they sent.</p>
        <Link href="/" className="mt-6 font-medium text-accent hover:underline">
          Back to your trips
        </Link>
      </div>
    );
  }

  const { trip } = lt;
  const readOnly = Boolean(lt.share && !lt.share.editKey);
  const me = trip.members.find((m) => m.id === lt.me);
  const s = SYNC_LABEL[sync.state];

  function go(t: TabId) {
    setTab(t);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <ReadOnlyCtx.Provider value={readOnly}>
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-[1100] border-b border-line bg-card/90 backdrop-blur">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
            <div className="flex items-center gap-3 py-3">
              <Link
                href="/"
                aria-label="All trips"
                className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-card transition hover:border-ink/40"
              >
                <Icon.ArrowLeft className="size-[18px]" />
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-display text-lg font-bold leading-tight sm:text-xl">{trip.name}</h1>
                <p className="flex items-center gap-2 truncate text-xs text-muted sm:text-sm">
                  <span>{fmtRange(trip.startDate, trip.endDate)}</span>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className={cx("size-2 rounded-full", s.dot)} aria-hidden />
                    {s.text}
                  </span>
                </p>
              </div>
              <Link
                href={`/trips/${trip.id}/print`}
                className="hidden min-h-11 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-semibold transition hover:border-ink/40 sm:inline-flex"
              >
                <Icon.Printer className="size-[18px]" /> Print
              </Link>
              <Button variant="primary" icon="Share" onClick={() => setSharing(true)}>
                Share
              </Button>
            </div>

            {/* Tabs */}
            <nav aria-label="Trip sections" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {TABS.map((t) => {
                const TabIcon = Icon[t.icon];
                return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => go(t.id)}
                  aria-current={tab === t.id ? "page" : undefined}
                  className={cx(
                    "relative flex min-h-12 shrink-0 items-center gap-2 px-3 text-sm font-semibold transition",
                    tab === t.id ? "text-accent" : "text-muted hover:text-ink",
                  )}
                >
                  <TabIcon className="size-[18px]" />
                  {t.label}
                  {tab === t.id ? <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-full bg-accent" /> : null}
                </button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Banners */}
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
          {sync.state === "conflict" ? (
            <div role="alert" className="pop-in mt-4 flex flex-col gap-3 rounded-2xl border border-[var(--critical)]/40 bg-coral-soft p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">
                <strong>Someone in your group saved changes at the same time.</strong> Keep theirs, or replace them with yours?
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => sync.resolve("theirs")}>
                  Use group&apos;s version
                </Button>
                <Button size="sm" variant="primary" onClick={() => sync.resolve("mine")}>
                  Keep mine
                </Button>
              </div>
            </div>
          ) : null}
          {readOnly ? (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-sky-soft p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">
                You&apos;re viewing a shared trip. It updates automatically, but you can&apos;t edit it. Ask for the edit link
                to plan along, or make your own copy.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  const copy = cloneAsNew(trip, " (my copy)");
                  putLocalTrip(copy);
                  router.push(`/trips/${copy.trip.id}`);
                }}
              >
                Make my own copy
              </Button>
            </div>
          ) : null}
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {tab === "overview" && <Overview lt={lt} go={go} />}
          {tab === "itinerary" && <Itinerary lt={lt} />}
          {tab === "places" && <Places lt={lt} />}
          {tab === "budget" && <Budget lt={lt} />}
          {tab === "group" && <Group lt={lt} openShare={() => setSharing(true)} />}
        </main>

        <Modal open={sharing} onClose={() => setSharing(false)} title="Share this trip">
          <ShareCard lt={lt} />
        </Modal>

        {/* First visit on a device: ask who this is so votes and payments are attributed. */}
        {!me && !readOnly && askWho ? <WhoAreYou tripId={trip.id} onDismiss={() => setAskWho(false)} /> : null}
      </div>
    </ReadOnlyCtx.Provider>
  );
}

function WhoAreYou({ tripId, onDismiss }: { tripId: string; onDismiss: () => void }) {
  const lt = useLocalTrip(tripId);
  const [name, setName] = useState("");
  if (!lt) return null;
  const { trip } = lt;

  function addMe() {
    const n = name.trim();
    if (!n) return;
    const mid = randomId(8);
    updateTrip(tripId, (t) => {
      t.members.push({ id: mid, name: n, color: MEMBER_COLORS[t.members.length % MEMBER_COLORS.length], familyId: null });
    });
    patchLocal(tripId, { me: mid });
  }

  return (
    <Modal open onClose={onDismiss} title="Who are you?">
      <p className="text-sm text-muted">
        Pick your name so your votes and payments are credited to you. You can change this later in Group.
      </p>
      {trip.members.length ? (
        <ul className="mt-4 grid gap-2">
          {trip.members.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => patchLocal(tripId, { me: m.id })}
                className="flex w-full items-center gap-3 rounded-2xl border border-line p-3 text-left hover:border-accent"
              >
                <Avatar m={m} />
                <span className="font-medium">{m.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <form
        className="mt-5 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addMe();
        }}
      >
        <Field label="I'm not listed" className="flex-1">
          {(id) => <input id={id} className={inputCls} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />}
        </Field>
        <Button type="submit" variant="primary" disabled={!name.trim()}>
          Join
        </Button>
      </form>
    </Modal>
  );
}
