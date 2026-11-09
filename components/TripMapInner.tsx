"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import type { Destination } from "../lib/types";
import { fmtRange } from "../lib/util";

/* OpenStreetMap tiles (free, attribution required). Markers are CSS divIcons, so no image assets. */

function pin(label: string, idea: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<div style="width:30px;height:30px;border-radius:999px;display:grid;place-items:center;font:600 13px var(--font-geist-sans);${
      idea
        ? "background:var(--card);color:var(--ink);border:2px dashed var(--muted)"
        : "background:var(--accent);color:var(--accent-ink);border:2px solid var(--card);box-shadow:0 2px 6px rgba(0,0,0,.25)"
    }">${label}</div>`,
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 9);
    else map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 10 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

export default function TripMapInner({ destinations }: { destinations: Destination[] }) {
  const planned = destinations.filter((d) => d.status === "planned");
  const ideas = destinations.filter((d) => d.status === "idea");
  const points = destinations.map((d) => [d.lat, d.lon] as [number, number]);

  return (
    <MapContainer
      center={points[0] ?? [-1.29, 36.82]}
      zoom={5}
      scrollWheelZoom={false}
      className="size-full"
      attributionControl
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        referrerPolicy="strict-origin-when-cross-origin"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {planned.length > 1 ? (
        <Polyline
          positions={planned.map((d) => [d.lat, d.lon])}
          pathOptions={{ color: "var(--accent)", weight: 3, dashArray: "6 8", opacity: 0.9 }}
        />
      ) : null}
      {planned.map((d, i) => (
        <Marker key={d.id} position={[d.lat, d.lon]} icon={pin(String(i + 1), false)} alt={d.name} zIndexOffset={1000}>
          <Popup>
            <strong>{d.name}</strong>
            <br />
            {d.arrive ? fmtRange(d.arrive, d.depart) : "Dates not set"}
          </Popup>
        </Marker>
      ))}
      {ideas.map((d) => (
        <Marker key={d.id} position={[d.lat, d.lon]} icon={pin("?", true)} alt={`${d.name} (idea)`}>
          <Popup>
            <strong>{d.name}</strong>
            <br />
            Idea · {d.votes.length} vote{d.votes.length === 1 ? "" : "s"}
          </Popup>
        </Marker>
      ))}
      <FitBounds points={points} />
    </MapContainer>
  );
}
