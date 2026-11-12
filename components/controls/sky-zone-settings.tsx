"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, MapPin, Search, X } from "lucide-react";
import ZoneLocationMap, { type ZoneLocationMapHandle } from "../map/zone-location-map";
import type { Place } from "../sky/live-sky";
import { MIN_RADIUS_NM, MAX_RADIUS_NM } from "../../lib/zone-progress";
import { createLocationSearch, type LocationSearchState, type SearchPlace } from "../../lib/location-search";


export default function SkyZoneSettings({ place, radiusNm, onApply, onClose }: {
  place: Place; radiusNm: number; onApply: (place: Place, radiusNm: number) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState(place);
  const [radius, setRadius] = useState(radiusNm);
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState<LocationSearchState>({ status: "idle", results: [] });
  const searchRef = useRef<ReturnType<typeof createLocationSearch> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLUListElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mapSelectionRef = useRef<ZoneLocationMapHandle>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const returnFocus = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.showModal();
    headingRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus();
    };
  }, []);
  useEffect(() => {
    const search = createLocationSearch(setSearchState);
    searchRef.current = search;
    return () => { search.dispose(); searchRef.current = null; };
  }, []);

  function close() {
    searchRef.current?.reset();
    onClose();
  }
  const { results, status } = searchState;
  const searching = status === "waiting" || status === "loading";
  const statusText = searching ? "Finding places…"
    : status === "ready" ? `${results.length} places found. Choose one to preview the map.`
    : status === "empty" ? "No places found. Try a nearby city or move the map."
    : status === "outside" ? "These places are outside the supported map area (85°S to 85°N)."
    : status === "error" ? "Search is unavailable. Edit your search to retry, or choose on the map."
    : "Results appear as you type. Search by city or postcode.";
  function clearSearch() {
    setQuery(""); searchRef.current?.reset(); inputRef.current?.focus();
  }
  function selectPlace(item: SearchPlace) {
    setDraft({ lat: item.latitude, lon: item.longitude, label: placeName(item), sample: false });
    setQuery(item.name);
    searchRef.current?.reset();
    inputRef.current?.focus();
  }
  const placeName = (item: SearchPlace) => [...new Set([item.name, item.admin1, item.country].filter(Boolean))].join(", ");
  return <dialog ref={dialogRef} id="sky-zone-panel" className="zone-settings-dialog" aria-labelledby="zone-settings-title" onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
  }}>
    <div className="zone-dialog-heading"><div><h2 ref={headingRef} tabIndex={-1} id="zone-settings-title">Location &amp; zone</h2><p>Move the map or search for a place.</p></div><button type="button" onClick={close} aria-label="Close location settings"><X size={18} aria-hidden="true" /></button></div>
    <div className="zone-settings-panel">
      <div className="zone-picker-map"><ZoneLocationMap selectionRef={mapSelectionRef} lat={draft.lat} lon={draft.lon} radiusKm={radius * 1.852} onMove={(lat, lon) => {
        setDraft({ lat, lon, label: "Selected map location", sample: false });
        searchRef.current?.reset();
      }} /><p id="zone-map-help">Drag, tap, or use the arrow keys to move the zone.</p></div>
      <p className="zone-selected-place"><strong>{draft.label.split(" · ")[0]}</strong><span>{draft.lat.toFixed(4)}, {draft.lon.toFixed(4)}</span></p>
      <section className="zone-search-section" aria-label="Location search">
        <form onSubmit={(event) => { event.preventDefault(); void searchRef.current?.flush(); }} className="zone-search-form" role="search">
          <label htmlFor="place-search">Search for a location</label>
          <div className="zone-search-field"><Search size={18} aria-hidden="true" />
            <input ref={inputRef} id="place-search" type="search" placeholder="City or postcode" autoComplete="off" maxLength={120} value={query} aria-describedby="place-search-status" aria-controls={results.length ? "place-search-results" : undefined} onChange={(event) => {
              setQuery(event.target.value); searchRef.current?.update(event.target.value);
            }} onKeyDown={(event) => {
              if (event.key === "ArrowDown" && results.length) { event.preventDefault(); resultsRef.current?.querySelector("button")?.focus(); }
              if (event.key === "Escape" && query) { event.preventDefault(); event.stopPropagation(); clearSearch(); }
            }} />
            {searching && <LoaderCircle size={17} className="zone-search-spinner" aria-label="Searching" />}
            {query && <button type="button" className="zone-search-clear" aria-label="Clear location search" onClick={clearSearch}><X size={16} aria-hidden="true" /></button>}
          </div>
        </form>
        <p id="place-search-status" className="zone-search-status" role="status" aria-live="polite">{statusText}</p>
        {results.length > 0 && <ul ref={resultsRef} id="place-search-results" className="zone-search-results" aria-label="Location search results">{results.map((item, index) => {
          const selected = Math.abs(item.latitude - draft.lat) < .00001 && Math.abs(item.longitude - draft.lon) < .00001;
          return <li key={item.id}><button type="button" onClick={() => selectPlace(item)} onKeyDown={(event) => {
            const buttons = resultsRef.current?.querySelectorAll("button");
            if (event.key === "ArrowDown") { event.preventDefault(); buttons?.[Math.min(index + 1, results.length - 1)]?.focus(); }
            if (event.key === "ArrowUp") { event.preventDefault(); if (index === 0) inputRef.current?.focus(); else buttons?.[index - 1]?.focus(); }
            if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); searchRef.current?.reset(); inputRef.current?.focus(); }
          }}><span className="zone-result-icon"><MapPin size={17} aria-hidden="true" /></span><span className="zone-result-copy"><strong>{item.name}</strong><small>{[...new Set([item.admin1, item.country].filter(Boolean))].join(", ")}</small></span>{selected && <Check size={17} aria-label="Selected location" />}</button></li>;
        })}</ul>}
      </section>
      <div className="zone-radius-control"><label htmlFor="zone-radius">Observation radius <strong>{radius} nautical {radius === 1 ? "mile" : "miles"}</strong></label><input id="zone-radius" type="range" min={MIN_RADIUS_NM} max={MAX_RADIUS_NM} step={1} value={radius} aria-valuetext={`${radius} nautical miles`} onChange={(event) => setRadius(Number(event.target.value))} /><div className="zone-radius-scale"><span>{MIN_RADIUS_NM} nm</span><span>{MAX_RADIUS_NM} nm</span></div><p>Distance from the centre. A larger zone includes aircraft farther away.</p></div>
    </div>
    <div className="zone-dialog-footer">
      <div className="zone-settings-actions"><button type="button" className="primary-button" onClick={() => {
        const selection = mapSelectionRef.current?.getSelection();
        const moved = selection && (Math.abs(selection.lat - draft.lat) > 1e-7 || Math.abs(selection.lon - draft.lon) > 1e-7);
        onApply(moved ? { ...selection, label: "Selected map location", sample: false } : draft, radius);
        close();
      }}>Apply location & zone</button><button type="button" className="zone-cancel" onClick={close}>Cancel</button></div>
      <p className="zone-search-credit">Location search by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> / <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a>.</p>
    </div>
  </dialog>;
}
