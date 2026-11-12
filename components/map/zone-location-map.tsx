"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { clampMapLatitude, wrapMapLongitude } from "../../lib/map-location";

export type ZoneLocationMapHandle = { getSelection: () => { lat: number; lon: number } | null };
type Props = { lat: number; lon: number; radiusKm: number; onMove: (lat: number, lon: number) => void; selectionRef?: Ref<ZoneLocationMapHandle> };

export default function ZoneLocationMap({ lat, lon, radiusKm, onMove, selectionRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const circleRef = useRef<Leaflet.Circle | null>(null);
  const markerRef = useRef<Leaflet.CircleMarker | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const onMoveRef = useRef(onMove);
  const initialRef = useRef({ lat, lon, radiusKm });
  const syncingRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { onMoveRef.current = onMove; }, [onMove]);
  useImperativeHandle(selectionRef, () => ({
    getSelection() {
      const map = mapRef.current;
      if (!map) return null;
      // Apply may be pressed before an inertial pan emits moveend.
      map.stop();
      const center = map.getCenter();
      return { lat: clampMapLatitude(center.lat), lon: wrapMapLongitude(center.lng) };
    },
  }), []);

  useEffect(() => {
    let cancelled = false;
    let map: Leaflet.Map | undefined;
    let observer: ResizeObserver | undefined;
    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;
      const initial = initialRef.current;
      leafletRef.current = L;
      map = L.map(containerRef.current, { zoomControl: false, scrollWheelZoom: false, worldCopyJump: true, trackResize: false, zoomSnap: .25, zoomDelta: .5 });
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      circleRef.current = L.circle([initial.lat, initial.lon], { radius: initial.radiusKm * 1000, color: "#317f98", weight: 2, dashArray: "5 7", fillColor: "#74adc0", fillOpacity: .12, interactive: false, className: "zone-circle" }).addTo(map);
      markerRef.current = L.circleMarker([initial.lat, initial.lon], { radius: 6, color: "#fff", weight: 3, fillColor: "#1e6e8b", fillOpacity: 1, interactive: false, className: "sky-location-marker" }).addTo(map);
      map.fitBounds(L.latLng(initial.lat, initial.lon).toBounds(initial.radiusKm * 2400), { padding: [24, 24], maxZoom: 13, animate: false });
      map.setView([initial.lat, initial.lon], map.getZoom(), { animate: false });
      let previous = map.getCenter();
      let clampedSelection = false;
      // Move the zone with every pan frame; publish the final centre only once.
      map.on("move", () => {
        let center = map!.getCenter();
        const latitude = clampMapLatitude(center.lat);
        if (latitude !== center.lat) {
          if (!syncingRef.current) clampedSelection = true;
          const syncing = syncingRef.current;
          syncingRef.current = true;
          map!.setView([latitude, center.lng], map!.getZoom(), { animate: false });
          syncingRef.current = syncing;
          center = map!.getCenter();
        }
        circleRef.current?.setLatLng(center);
        markerRef.current?.setLatLng(center);
      });
      map.on("moveend", () => {
        const center = map!.getCenter();
        const changed = Math.abs(center.lat - previous.lat) > 1e-7 || Math.abs(wrapMapLongitude(center.lng - previous.lng)) > 1e-7;
        previous = center;
        if (!syncingRef.current && (changed || clampedSelection)) {
          clampedSelection = false;
          onMoveRef.current(center.lat, wrapMapLongitude(center.lng));
        }
      });
      map.on("click", (event: Leaflet.LeafletMouseEvent) => map!.panTo(event.latlng, { animate: false }));
      observer = new ResizeObserver(() => {
        if (!map) return;
        const center = map.getCenter();
        syncingRef.current = true;
        map.invalidateSize({ animate: false, pan: true });
        map.setView(center, map.getZoom(), { animate: false });
        syncingRef.current = false;
      });
      observer.observe(containerRef.current);
      setReady(true);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true; observer?.disconnect(); map?.remove();
      mapRef.current = null; circleRef.current = null; markerRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const center = map.getCenter();
    if (Math.abs(center.lat - lat) < 1e-7 && Math.abs(wrapMapLongitude(center.lng - lon)) < 1e-7) return;
    // Search results recenter without turning that move into a manual selection.
    syncingRef.current = true;
    map.setView([lat, center.lng + wrapMapLongitude(lon - center.lng)], map.getZoom(), { animate: false });
    syncingRef.current = false;
  }, [ready, lat, lon]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!ready || !map || !L) return;
    circleRef.current?.setRadius(radiusKm * 1000);
    syncingRef.current = true;
    const center = map.getCenter();
    map.fitBounds(center.toBounds(radiusKm * 2400), { padding: [24, 24], maxZoom: 13, animate: false });
    map.setView(center, map.getZoom(), { animate: false });
    syncingRef.current = false;
  }, [ready, radiusKm]);

  return <div className="zone-location-map-wrap">
    <div ref={containerRef} className="flight-map zone-location-map" role="region" aria-label="Choose location on map" aria-describedby="zone-map-help" />
    <span className="zone-map-radius-badge">{Math.round(radiusKm / 1.852)} nm radius</span>
    {!ready && <p className="zone-map-loading" role="status">{failed ? "Map unavailable. Search for a location below." : "Loading map…"}</p>}
  </div>;
}
