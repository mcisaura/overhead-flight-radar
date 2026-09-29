"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { MapPin, Navigation2 } from "lucide-react";
import { ZONE_RADIUS_KM } from "../lib/zone-progress";
import { airlineIdentity, displayAircraftType, displayFlightName, formatDistanceNm, type AirlineIdentity } from "../lib/flight-display";
import AircraftModelLabel from "./aircraft-model-label";
import "leaflet/dist/leaflet.css";

type AirportPoint = { code: string; city: string; lat?: number | null; lon?: number | null };

export type MapAircraft = {
  hex: string;
  callsign: string | null;
  registration: string | null;
  aircraftType: string | null;
  airlineIcao?: string | null;
  airlineIata?: string | null;
  flightNumber?: string | null;
  originCode?: string | null;
  destinationCode?: string | null;
  origin?: AirportPoint | null;
  destination?: AirportPoint | null;
  airline?: AirlineIdentity | null;
  displayName?: string | null;
  displayType?: string | null;
  aircraftModel?: string | null;
  lat: number;
  lon: number;
  heading: number | null;
  altitudeFt: number | null;
  speedKts: number | null;
  distanceKm: number;
  seenSeconds: number;
  estimated?: boolean;
};

type Props = {
  lat: number;
  lon: number;
  aircraft: MapAircraft[];
  closestHex: string | null;
  loading: boolean;
  unavailable: boolean;
  demo?: boolean;
  locationLabel?: string;
  showDetails?: boolean;
  exiting?: boolean;
  onSelect?: (hex: string) => void;
};

type RouteDrawing =
  | { kind: "route"; inbound: Leaflet.Polyline; outbound: Leaflet.Polyline }
  | { kind: "heading"; path: Leaflet.Polyline };

const planeShape = '<svg viewBox="0 0 32 32" width="27" height="27" aria-hidden="true"><path d="M16 2.5 19.2 13l9.4 5.1v3l-10.8-3.2-.8 8.2 4 2.3v2.1L16 29l-5 1.5v-2.1l4-2.3-.8-8.2-10.8 3.2v-3L12.8 13 16 2.5Z" fill="currentColor" stroke="white" stroke-width="1.2" stroke-linejoin="round"/></svg>';

function formatName(plane: MapAircraft) {
  const icao = plane.airlineIcao || plane.callsign?.match(/^([A-Z]{3})\d/)?.[1];
  const airline = plane.airline ?? airlineIdentity(icao, plane.airlineIata);
  return plane.displayName || displayFlightName(plane.callsign, airline, plane.flightNumber) || plane.registration || plane.hex.toUpperCase();
}

function hasCoordinates(airport: AirportPoint | null | undefined): airport is AirportPoint & { lat: number; lon: number } {
  return typeof airport?.lat === "number" && Number.isFinite(airport.lat)
    && typeof airport.lon === "number" && Number.isFinite(airport.lon);
}

function headingPoint(plane: MapAircraft, distanceKm: number) {
  const radians = (plane.heading ?? 0) * Math.PI / 180;
  const kmPerLon = Math.max(.001, 111.32 * Math.cos(plane.lat * Math.PI / 180));
  return [plane.lat + Math.cos(radians) * distanceKm / 111.32,
    plane.lon + Math.sin(radians) * distanceKm / kmPerLon] as [number, number];
}

export default function FlightMap({ lat, lon, aircraft, closestHex, loading, unavailable, demo = false, locationLabel, showDetails = true, exiting = false, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const routeLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const airportLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const routeDrawingsRef = useRef<Map<string, RouteDrawing>>(new Map());
  const markersRef = useRef<Map<string, Leaflet.Marker>>(new Map());
  const markerStyleRef = useRef<Map<string, string>>(new Map());
  const markerLabelRef = useRef<Map<string, string>>(new Map());
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [nearViewport, setNearViewport] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [selectedHex, setSelectedHex] = useState<string | null>(closestHex);
  const [view, setView] = useState<"local" | "route">("local");

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      const timer = setTimeout(() => { setNearViewport(true); setHasEntered(true); }, 0);
      return () => clearTimeout(timer);
    }
    const observer = new IntersectionObserver(([entry]) => {
      setNearViewport(entry.isIntersecting);
      if (entry.isIntersecting) setHasEntered(true);
    }, { rootMargin: "200px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasEntered) return;
    let cancelled = false;
    let map: Leaflet.Map | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const markers = markersRef.current;
    const markerStyles = markerStyleRef.current;
    const markerLabels = markerLabelRef.current;
    const routeDrawings = routeDrawingsRef.current;
    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;
      map = L.map(containerRef.current, { scrollWheelZoom: false, zoomControl: false }).setView([lat, lon], 11);
      mapRef.current = map;
      resizeObserver = new ResizeObserver(() => map?.invalidateSize({ animate: false }));
      resizeObserver.observe(containerRef.current);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.circle([lat, lon], { radius: ZONE_RADIUS_KM * 1000, color: "#317f98", weight: 1, dashArray: "5 7", fillColor: "#74adc0", fillOpacity: 0.075, interactive: false, className: "zone-circle" }).addTo(map);
      L.circleMarker([lat, lon], { radius: 8, color: "#fff", weight: 3, fillColor: "#1e6e8b", fillOpacity: 1 })
        .bindTooltip(locationLabel ?? (demo ? "Sample location" : "Your location"), { direction: "top" }).addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);
      airportLayerRef.current = L.layerGroup().addTo(map);
      markerLayerRef.current = L.layerGroup().addTo(map);
      setReady(true);
    });
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      map?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      routeLayerRef.current = null;
      airportLayerRef.current = null;
      routeDrawings.clear();
      markers.clear();
      markerStyles.clear();
      markerLabels.clear();
      leafletRef.current = null;
    };
  }, [hasEntered, lat, lon, demo, locationLabel]);

  const activeHex = onSelect ? closestHex : selectedHex && aircraft.some((plane) => plane.hex === selectedHex)
    ? selectedHex : closestHex || aircraft[0]?.hex || null;
  const selected = aircraft.find((plane) => plane.hex === activeHex) ?? null;
  const routeAvailable = hasCoordinates(selected?.origin) && hasCoordinates(selected?.destination);
  const activeView = routeAvailable ? view : "local";
  const routeOrigin = hasCoordinates(selected?.origin) ? selected.origin : null;
  const routeDestination = hasCoordinates(selected?.destination) ? selected.destination : null;
  const originLat = routeOrigin?.lat ?? null;
  const originLon = routeOrigin?.lon ?? null;
  const originCode = routeOrigin?.code ?? "";
  const destinationLat = routeDestination?.lat ?? null;
  const destinationLon = routeDestination?.lon ?? null;
  const destinationCode = routeDestination?.code ?? "";
  useEffect(() => {
    const L = leafletRef.current;
    const layer = routeLayerRef.current;
    if (!ready || !nearViewport || !L || !layer) return;
    const visible = new Set(aircraft.map((plane) => plane.hex));
    for (const [hex, drawing] of routeDrawingsRef.current) {
      if (visible.has(hex)) continue;
      if (drawing.kind === "route") {
        layer.removeLayer(drawing.inbound);
        layer.removeLayer(drawing.outbound);
      } else {
        layer.removeLayer(drawing.path);
      }
      routeDrawingsRef.current.delete(hex);
    }
    for (const plane of aircraft) {
      const highlighted = plane.hex === activeHex;
      const color = highlighted ? "#b75f43" : "#58879a";
      const weight = highlighted ? 3 : 1.5;
      const opacity = highlighted ? .9 : .55;
      const existing = routeDrawingsRef.current.get(plane.hex);
      if (hasCoordinates(plane.origin) && hasCoordinates(plane.destination)) {
        if (existing?.kind === "route") {
          existing.inbound.setLatLngs([[plane.origin.lat, plane.origin.lon], [plane.lat, plane.lon]]);
          existing.outbound.setLatLngs([[plane.lat, plane.lon], [plane.destination.lat, plane.destination.lon]]);
          existing.inbound.setStyle({ color, weight, opacity });
          existing.outbound.setStyle({ color, weight, opacity });
        } else {
          if (existing?.kind === "heading") layer.removeLayer(existing.path);
          const inbound = L.polyline([[plane.origin.lat, plane.origin.lon], [plane.lat, plane.lon]],
            { color, weight, opacity, interactive: false }).addTo(layer);
          const outbound = L.polyline([[plane.lat, plane.lon], [plane.destination.lat, plane.destination.lon]],
            { color, weight, opacity, dashArray: "6 7", interactive: false }).addTo(layer);
          routeDrawingsRef.current.set(plane.hex, { kind: "route", inbound, outbound });
        }
      } else if (plane.heading !== null) {
        const points = [headingPoint(plane, -ZONE_RADIUS_KM), [plane.lat, plane.lon] as [number, number], headingPoint(plane, ZONE_RADIUS_KM)];
        if (existing?.kind === "heading") {
          existing.path.setLatLngs(points);
          existing.path.setStyle({ color, weight, opacity: highlighted ? .75 : .4 });
        } else {
          if (existing?.kind === "route") {
            layer.removeLayer(existing.inbound);
            layer.removeLayer(existing.outbound);
          }
          const path = L.polyline(points,
            { color, weight, opacity: highlighted ? .75 : .4, dashArray: "3 7", interactive: false }).addTo(layer);
          routeDrawingsRef.current.set(plane.hex, { kind: "heading", path });
        }
      } else if (existing) {
        if (existing.kind === "route") {
          layer.removeLayer(existing.inbound);
          layer.removeLayer(existing.outbound);
        } else {
          layer.removeLayer(existing.path);
        }
        routeDrawingsRef.current.delete(plane.hex);
      }
    }
  }, [aircraft, ready, nearViewport, activeHex]);

  useEffect(() => {
    const L = leafletRef.current;
    const layer = airportLayerRef.current;
    if (!ready || !nearViewport || !L || !layer) return;
    layer.clearLayers();
    if (!routeAvailable) return;
    for (const airport of [
      { lat: originLat, lon: originLon, code: originCode },
      { lat: destinationLat, lon: destinationLon, code: destinationCode },
    ]) {
      if (airport.lat === null || airport.lon === null) continue;
      L.circleMarker([airport.lat, airport.lon], { radius: 5, color: "#173746", weight: 2, fillColor: "#fffefa", fillOpacity: 1 })
        .bindTooltip(airport.code, { permanent: activeView === "route", direction: "top", offset: [0, -6] }).addTo(layer);
    }
  }, [ready, nearViewport, routeAvailable, activeView, originLat, originLon, originCode, destinationLat, destinationLon, destinationCode]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!ready || !map || !L) return;
    if (activeView === "route" && originLat !== null && originLon !== null && destinationLat !== null && destinationLon !== null) {
      map.fitBounds(L.latLngBounds([[originLat, originLon], [lat, lon], [destinationLat, destinationLon]]),
        { paddingTopLeft: [48, 60], paddingBottomRight: [48, 80], maxZoom: 6, animate: false });
    } else {
      map.setView([lat, lon], 11, { animate: false });
    }
  }, [ready, activeView, activeHex, originLat, originLon, destinationLat, destinationLon, lat, lon]);

  useEffect(() => {
    const L = leafletRef.current;
    const layer = markerLayerRef.current;
    if (!ready || !nearViewport || !L || !layer) return;
    const visible = new Set(aircraft.map((plane) => plane.hex));
    for (const [hex, marker] of markersRef.current) {
      if (!visible.has(hex)) {
        layer.removeLayer(marker);
        markersRef.current.delete(hex);
        markerStyleRef.current.delete(hex);
        markerLabelRef.current.delete(hex);
      }
    }
    for (const plane of aircraft) {
      const selected = plane.hex === activeHex;
      const heading = plane.heading ?? 0;
      const style = `${heading}:${selected}`;
      let marker = markersRef.current.get(plane.hex);
      const styleChanged = markerStyleRef.current.get(plane.hex) !== style;
      const name = formatName(plane);
      const icon = () => L.divIcon({
        className: `plane-marker ${selected ? "plane-marker-selected" : ""}`,
        html: `<span class="plane-marker-icon" style="transform:rotate(${heading}deg)">${planeShape}</span>`,
        iconSize: [38, 38], iconAnchor: [19, 19],
      });
      if (marker) {
        const current = marker.getLatLng();
        if (current.lat !== plane.lat || current.lng !== plane.lon) marker.setLatLng([plane.lat, plane.lon]);
        if (styleChanged) {
          marker.setIcon(icon());
          marker.setZIndexOffset(selected ? 1000 : 0);
        }
      } else {
        marker = L.marker([plane.lat, plane.lon], { icon: icon(), zIndexOffset: selected ? 1000 : 0, keyboard: true, title: name });
        marker.addTo(layer);
        markersRef.current.set(plane.hex, marker);
        marker.on("click", () => onSelectRef.current ? onSelectRef.current(plane.hex) : setSelectedHex(plane.hex));
      }
      markerStyleRef.current.set(plane.hex, style);
      if (markerLabelRef.current.get(plane.hex) !== name) {
        const label = document.createElement("span");
        label.textContent = name;
        marker.bindTooltip(label, { direction: "top", offset: [0, -18] });
        markerLabelRef.current.set(plane.hex, name);
      }
    }
  }, [aircraft, ready, nearViewport, activeHex]);

  return (
    <section className={`map-section ${exiting ? "map-exiting" : selected ? "map-active" : "map-empty"}`} aria-label="Flight map">
      <div className="map-frame">
        <div ref={containerRef} className="flight-map" role="application" aria-label={demo ? "Interactive map of fictional aircraft" : "Interactive map of nearby aircraft"} />
        <div className="map-chart-grid" aria-hidden="true" />
        <div className="map-view-switch" role="group" aria-label="Map view"><button type="button" aria-pressed={activeView === "local"} onClick={() => setView("local")}>Local sky</button><button type="button" aria-pressed={activeView === "route"} disabled={!routeAvailable} onClick={() => setView("route")}>Full route</button></div>
        <div className="map-key"><span className="map-key-plane"><Navigation2 size={15} fill="currentColor" /></span> Aircraft <span className="map-key-location" /> {locationLabel ?? (demo ? "Sample location" : "Your location")}</div>
        {showDetails && <div className="map-flight-card" aria-live="polite">
          {selected ? <>
            <span className="map-card-label">{demo ? "SAMPLE FLIGHT" : selected.hex === closestHex ? "TRACKED AIRCRAFT" : "SELECTED AIRCRAFT"}</span>
            <strong title={selected.callsign || undefined} tabIndex={selected.callsign ? 0 : undefined}>{formatName(selected)}</strong>
            <span className="map-card-type"><span title={selected.aircraftType || undefined} tabIndex={selected.aircraftType ? 0 : undefined}><AircraftModelLabel label={selected.displayType || displayAircraftType(selected.aircraftType, selected.aircraftModel)} /></span>{selected.registration && selected.registration !== selected.callsign ? ` · ${selected.registration}` : ""}</span>
            {selected.hex !== closestHex && <div className="map-card-stats">
              <span><small>Altitude</small>{selected.altitudeFt == null ? "—" : `${Math.round(selected.altitudeFt).toLocaleString()} ft`}</span>
              <span><small>Speed</small>{selected.speedKts == null ? "—" : `${Math.round(selected.speedKts)} kt`}</span>
              <span><small>Distance</small>{formatDistanceNm(selected.distanceKm)}</span>
            </div>}
            <span className="map-card-age">{demo ? "Simulated aircraft position" : `${selected.estimated ? "Estimated position" : "Reported position"} · last report ${Math.round(selected.seenSeconds)} sec ago`}</span>
          </> : <>
            <MapPin size={20} aria-hidden="true" />
            <strong>{unavailable ? "Live positions unavailable" : loading ? "Finding nearby aircraft…" : demo ? "No plane in the zone" : "No aircraft nearby"}</strong>
            <span className="map-card-type">{unavailable ? "Try refreshing in a moment." : loading ? "Updating the live map." : demo ? "Choose a sample flight to begin the crossing." : "Try again in a moment as the sky changes."}</span>
          </>}
        </div>}
      </div>
      <p className="map-note">{demo
        ? "These fictional paths illustrate the planned crossing; they are not recorded tracks. The airliner’s solid and dashed lines show its sample airport route. Local flights use a short heading projection because airport endpoints are unspecified. The circle marks the sample 5 nautical mile zone."
        : "Solid lines connect reported departure airports to aircraft; dashed lines project onward to reported arrivals. These are illustrative paths, not recorded tracks. When an airport is unavailable, a short dashed line projects the aircraft’s heading. Live positions are estimated between reports for up to 90 seconds. The circle marks the 5 nautical mile zone."}</p>
    </section>
  );
}
