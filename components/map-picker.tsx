"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "@/components/platform/theme";
import { domTheme } from "@/lib/map";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const STYLE = {
  dark: "mapbox://styles/mapbox/dark-v11",
  light: "mapbox://styles/mapbox/light-v11",
} as const;

/** Mapa con un pin que se mueve con clic o arrastre. La posición es controlada: si cambia desde fuera, el pin la sigue. */
export default function MapPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const initial = useRef({ lat, lng, theme });
  const appliedTheme = useRef(theme);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;
    const start = initial.current;
    appliedTheme.current = domTheme();

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: STYLE[domTheme()],
      center: [start.lng, start.lat],
      zoom: 12,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    const marker = new mapboxgl.Marker({ draggable: true, color: "#ff7a1a" })
      .setLngLat([start.lng, start.lat])
      .addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLngLat();
      onChangeRef.current(pos.lat, pos.lng);
    });
    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      onChangeRef.current(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    const pos = marker.getLngLat();
    if (Math.abs(pos.lat - lat) > 1e-6 || Math.abs(pos.lng - lng) > 1e-6) {
      marker.setLngLat([lng, lat]);
      map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 15), duration: 600 });
    }
  }, [lat, lng]);

  useEffect(() => {
    const actual = domTheme();
    if (appliedTheme.current === actual) return;
    appliedTheme.current = actual;
    mapRef.current?.setStyle(STYLE[actual]);
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className="h-60 w-full overflow-hidden rounded-[var(--r-lg)] border border-line sm:h-72"
      role="application"
      aria-label="Map. Click or drag the pin to set the pitch location."
    />
  );
}
