import { useEffect, useRef } from "react";
import L from "leaflet";
import { cn } from "@/lib/utils";

export interface MapMarker {
  lat: number;
  lng: number;
  title?: string;
  label?: string;
  tone?: "primary" | "incident" | "responder" | "start" | "destination";
}

export interface MapPathPoint {
  lat: number;
  lng: number;
}

export interface LeafletMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  accuracy?: number | null;
  markers?: MapMarker[];
  path?: MapPathPoint[];
  className?: string;
  height?: string;
  interactive?: boolean;
}

const TONE_COLORS: Record<string, { bg: string; ring: string }> = {
  primary: { bg: "#e11d48", ring: "rgba(225, 29, 72, 0.35)" },
  incident: { bg: "#dc2626", ring: "rgba(220, 38, 38, 0.4)" },
  responder: { bg: "#059669", ring: "rgba(5, 150, 105, 0.35)" },
  start: { bg: "#2563eb", ring: "rgba(37, 99, 235, 0.35)" },
  destination: { bg: "#7c3aed", ring: "rgba(124, 58, 237, 0.35)" },
};

function createPinIcon(label?: string, tone: keyof typeof TONE_COLORS = "primary") {
  const { bg, ring } = TONE_COLORS[tone] || TONE_COLORS.primary;
  return L.divIcon({
    className: "suraksha-custom-pin",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        ${label ? `<span style="background: rgba(15, 23, 42, 0.85); color: white; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 9999px; margin-bottom: 4px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${label}</span>` : ""}
        <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${ring}; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 20px; height: 20px; border-radius: 50%; background: ${bg}; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.35); position: relative; z-index: 2;"></div>
        </div>
        <div style="width: 2px; height: 6px; background: ${bg}; margin-top: -2px;"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function LeafletMap({
  center,
  zoom = 15,
  accuracy,
  markers = [],
  path = [],
  className,
  height = "360px",
  interactive = true,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize map instance once
  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: interactive,
      dragging: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      scrollWheelZoom: false, // Prevent page scroll lock
      attributionControl: true,
    });

    // High quality OpenStreetMap raster tiles (requires ZERO WebGL)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = layerGroup;

    // Invalidate size on load and resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    // Initial size invalidate after mount transition
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Update map view, markers, accuracy circle, and polyline dynamically
  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // Accuracy circle if provided
    if (accuracy && accuracy > 0) {
      L.circle([center.lat, center.lng], {
        radius: accuracy,
        color: "#e11d48",
        fillColor: "#fb7185",
        fillOpacity: 0.16,
        weight: 1.5,
      }).addTo(layerGroup);
    }

    // Traveled path / polyline if provided
    if (path.length > 1) {
      const latLngs = path.map((p) => [p.lat, p.lng] as [number, number]);
      L.polyline(latLngs, {
        color: "#e11d48",
        weight: 4,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layerGroup);
    }

    // Additional markers or default center marker
    if (markers.length > 0) {
      for (const m of markers) {
        const icon = createPinIcon(m.label, m.tone);
        const marker = L.marker([m.lat, m.lng], { icon });
        if (m.title) marker.bindPopup(m.title);
        marker.addTo(layerGroup);
      }
    } else {
      // Default single marker at center
      const icon = createPinIcon(undefined, "primary");
      L.marker([center.lat, center.lng], { icon }).addTo(layerGroup);
    }

    // Pan / zoom smoothly
    map.setView([center.lat, center.lng], zoom);
    map.invalidateSize();
  }, [center.lat, center.lng, zoom, accuracy, markers, path]);

  return (
    <div
      ref={containerRef}
      className={cn("w-full relative rounded-2xl overflow-hidden shadow-inner border border-slate-200 bg-slate-100", className)}
      style={{ height, minHeight: "260px" }}
    />
  );
}

// Re-export as MapView for backward compatibility
export const MapView = LeafletMap;
export default LeafletMap;
