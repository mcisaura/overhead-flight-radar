"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { MapPin, Navigation2 } from "lucide-react";
import { ZONE_RADIUS_KM } from "../lib/zone-progress";
import "leaflet/dist/leaflet.css";

export type MapAircraft = {
  hex: string;
  callsign: string | null;
  registration: string | null;
  aircraftType: string | null;
  lat: number;
  lon: number;
  heading: number | null;
  altitudeFt: number;
  speedKts: number | null;
  distanceKm: number;
  seenSeconds: number;
};

type Props = {
  lat: number;
  lon: number;
  aircraft: MapAircraft[];
  closestHex: string | null;
  selectedAircraftHex?: string | null;
  loading: boolean;
  unavailable: boolean;
  demo?: boolean;
  locationLabel?: string;
  showDetails?: boolean;
  exiting?: boolean;
  onSelect?: (hex: string) => void;
};

const planeShape = '<svg viewBox="0 0 32 32" width="27" height="27" aria-hidden="true"><path d="M16 2.5 19.2 13l9.4 5.1v3l-10.8-3.2-.8 8.2 4 2.3v2.1L16 29l-5 1.5v-2.1l4-2.3-.8-8.2-10.8 3.2v-3L12.8 13 16 2.5Z" fill="currentColor" stroke="white" stroke-width="1.2" stroke-linejoin="round"/></svg>';

function formatName(plane: MapAircraft) {
  return plane.callsign || plane.registration || plane.hex.toUpperCase();
}

export default function FlightMap({ lat, lon, aircraft, closestHex, selectedAircraftHex, loading, unavailable, demo = false, locationLabel, showDetails = true, exiting = false, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, Leaflet.Marker>>(new Map());
  const markerStyleRef = useRef<Map<string, string>>(new Map());
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const [ready, setReady] = useState(false);
  const [selectedHex, setSelectedHex] = useState<string | null>(closestHex);

  useEffect(() => {
    let cancelled = false;
    let map: Leaflet.Map | null = null;
    const markers = markersRef.current;
    const markerStyles = markerStyleRef.current;
    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;
      map = L.map(containerRef.current, { scrollWheelZoom: false, zoomControl: false }).setView([lat, lon], 10);
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.circle([lat, lon], { radius: ZONE_RADIUS_KM * 1000, color: "#317f98", weight: 1, dashArray: "5 7", fillColor: "#74adc0", fillOpacity: 0.075, interactive: false }).addTo(map);
      L.circleMarker([lat, lon], { radius: 8, color: "#fff", weight: 3, fillColor: "#1e6e8b", fillOpacity: 1 })
        .bindTooltip(locationLabel ?? (demo ? "Sample location" : "Your location"), { direction: "top" }).addTo(map);
      markerLayerRef.current = L.layerGroup().addTo(map);
      setReady(true);
    });
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      markers.clear();
      markerStyles.clear();
      leafletRef.current = null;
    };
  }, [lat, lon, demo, locationLabel]);

  const activeHex = onSelect ? selectedAircraftHex ?? closestHex : selectedHex && aircraft.some((plane) => plane.hex === selectedHex)
    ? selectedHex : closestHex || aircraft[0]?.hex || null;

  useEffect(() => {
    const L = leafletRef.current;
    const layer = markerLayerRef.current;
    if (!ready || !L || !layer) return;
    const visible = new Set(aircraft.map((plane) => plane.hex));
    for (const [hex, marker] of markersRef.current) {
      if (!visible.has(hex)) {
        layer.removeLayer(marker);
        markersRef.current.delete(hex);
        markerStyleRef.current.delete(hex);
      }
    }
    for (const plane of aircraft) {
      const selected = plane.hex === activeHex;
      const heading = plane.heading ?? 0;
      const style = `${heading}:${selected}`;
      const icon = L.divIcon({
        className: `plane-marker ${selected ? "plane-marker-selected" : ""}`,
        html: `<span class="plane-marker-icon" style="transform:rotate(${heading}deg)">${planeShape}</span>`,
        iconSize: [38, 38], iconAnchor: [19, 19],
      });
      let marker = markersRef.current.get(plane.hex);
      if (marker) {
        marker.setLatLng([plane.lat, plane.lon]);
        if (markerStyleRef.current.get(plane.hex) !== style) marker.setIcon(icon);
        marker.setZIndexOffset(selected ? 1000 : 0);
        marker.off("click");
      } else {
        marker = L.marker([plane.lat, plane.lon], { icon, zIndexOffset: selected ? 1000 : 0, keyboard: true, title: formatName(plane) });
        marker.addTo(layer);
        markersRef.current.set(plane.hex, marker);
      }
      markerStyleRef.current.set(plane.hex, style);
      const label = document.createElement("span");
      label.textContent = formatName(plane);
      marker.bindTooltip(label, { direction: "top", offset: [0, -18] });
      marker.on("click", () => onSelect ? onSelect(plane.hex) : setSelectedHex(plane.hex));
    }
  }, [aircraft, ready, activeHex, onSelect]);

  const selected = aircraft.find((plane) => plane.hex === activeHex) ?? null;

  return (
    <section className={`map-section ${exiting ? "map-exiting" : selected ? "map-active" : "map-empty"}`} aria-labelledby="map-title">
      <div className="map-heading">
        <div>
          <h2 id="map-title">Flights around you</h2>
        </div>
        <span className="map-count">{aircraft.length} aircraft in zone</span>
      </div>
      <div className="map-frame">
        <div ref={containerRef} className="flight-map" role="application" aria-label={demo ? "Interactive map of fictional aircraft" : "Interactive map of nearby aircraft"} />
        <div className="map-key"><span className="map-key-plane"><Navigation2 size={15} fill="currentColor" /></span> Aircraft <span className="map-key-location" /> {locationLabel ?? (demo ? "Sample location" : "Your location")}</div>
        {showDetails && <div className="map-flight-card" aria-live="polite">
          {selected ? <>
            <span className="map-card-label">{demo ? "SAMPLE FLIGHT" : selected.hex === closestHex ? "CLOSEST AIRCRAFT" : "SELECTED AIRCRAFT"}</span>
            <strong>{formatName(selected)}</strong>
            <span className="map-card-type">{selected.aircraftType || "Aircraft type unavailable"}{selected.registration && selected.registration !== selected.callsign ? ` · ${selected.registration}` : ""}</span>
            <div className="map-card-stats">
              <span><small>Altitude</small>{Math.round(selected.altitudeFt).toLocaleString()} ft</span>
              <span><small>Speed</small>{selected.speedKts == null ? "—" : `${Math.round(selected.speedKts)} kt`}</span>
              <span><small>Distance</small>{selected.distanceKm.toFixed(1)} km</span>
            </div>
            <span className="map-card-age">{demo ? "Simulated aircraft position" : `Position received ${Math.round(selected.seenSeconds)} sec ago`}</span>
          </> : <>
            <MapPin size={20} aria-hidden="true" />
            <strong>{unavailable ? "Live positions unavailable" : loading ? "Finding nearby aircraft…" : demo ? "No plane in the zone" : "No aircraft nearby"}</strong>
            <span className="map-card-type">{unavailable ? "Try refreshing in a moment." : loading ? "Updating the live map." : demo ? "Choose a sample flight to begin the crossing." : "Try again in a moment as the sky changes."}</span>
          </>}
        </div>}
      </div>
      <p className="map-note">{demo ? "The dashed circle marks the 20 nautical mile zone." : "Positions are reported by aircraft, so coverage and timing can vary. The dashed circle shows the 20 nautical mile zone."}</p>
    </section>
  );
}
