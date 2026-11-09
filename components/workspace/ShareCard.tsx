"use client";

import { useState } from "react";
import { patchLocal } from "../../lib/store";
import { downloadTrip, linkOnlyUrl, publishTrip, shareLinks, useSharingAvailable } from "../../lib/shareClient";
import type { LocalTrip } from "../../lib/types";
import { Button, CopyField } from "../ui";

export default function ShareCard({ lt }: { lt: LocalTrip }) {
  const available = useSharingAvailable();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const { trip, share } = lt;

  async function publish() {
    setBusy(true);
    setErr("");
    try {
      await publishTrip(trip.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't share the trip");
    } finally {
      setBusy(false);
    }
  }

  const linkOnly = (
    <div className="grid gap-4">
      <CopyField
        label="Trip link"
        value={linkOnlyUrl(trip)}
        hint="Contains a full copy of the trip. Whoever opens it gets their own copy; changes don't sync back."
      />
      <Button icon="Download" onClick={() => downloadTrip(trip)}>Download trip file</Button>
    </div>
  );

  if (share) {
    const links = shareLinks(share);
    return (
      <div className="grid gap-5">
        <p className="text-sm text-muted">
          {share.editKey
            ? "This trip is shared. Everyone with the edit link plans together and sees changes within seconds."
            : "You're following a shared trip with view access."}
        </p>
        {links.edit ? (
          <CopyField label="Edit link, for co-planners" value={links.edit} hint="Anyone with this link can change the trip. Share it only with your group." />
        ) : null}
        <CopyField label="View link, read only" value={links.view} hint="Good for grandparents, drivers or anyone who just needs the plan." />
        <details className="rounded-2xl bg-paper p-4">
          <summary className="cursor-pointer text-sm font-medium">Other options</summary>
          <div className="mt-4 grid gap-4">
            {linkOnly}
            <Button
              variant="danger"
              onClick={() => {
                if (confirm("Stop syncing on this device? The group's copy is not deleted, and you keep a local copy.")) {
                  patchLocal(trip.id, { share: undefined, dirty: false });
                }
              }}
            >
              Stop syncing on this device
            </Button>
          </div>
        </details>
      </div>
    );
  }

  if (available === null) return <div className="h-32 animate-pulse rounded-2xl bg-sunk" />;

  if (available) {
    return (
      <div className="grid gap-5">
        <div className="rounded-2xl bg-sun-soft p-4 text-sm">
          <p className="font-medium">Plan together in real time</p>
          <p className="mt-1">
            You&apos;ll get two links: an <strong>edit link</strong> for co-planners and a <strong>view link</strong> for
            everyone else. No accounts needed.
          </p>
        </div>
        <Button variant="primary" icon="Users" disabled={busy} onClick={publish}>
          {busy ? "Sharing…" : "Share with my group"}
        </Button>
        {err ? <p className="text-sm text-[var(--critical)]">{err}</p> : null}
        <details className="rounded-2xl bg-paper p-4">
          <summary className="cursor-pointer text-sm font-medium">Share a copy instead</summary>
          <div className="mt-4">{linkOnly}</div>
        </details>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <p className="text-sm text-muted">
        Live group sharing isn&apos;t switched on for this site, so share a copy: send the link or file, and your group
        can open it in Waypoint.
      </p>
      {linkOnly}
    </div>
  );
}
