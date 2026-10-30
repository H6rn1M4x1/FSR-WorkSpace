import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Locate, Eraser, Route } from "lucide-react";
import { getAccentColorHex } from "./WeeklyScheduleGrid";

// Mapa para dibujar un recorrido a mano: mantener presionado marca el punto de partida, arrastrar
// va trazando la ruta sobre las calles, y soltar marca el punto de llegada — calcula los km
// (sumando la distancia geodésica entre cada punto trazado, no la línea recta) y estima los pasos
// con la misma proporción que ya usa el resto de la app (km = pasos * 0.000762). A diferencia de
// LocationPickerMap, acá el arrastre se usa para dibujar en vez de desplazar el mapa (dragging:
// false), así que para reencuadrar se usa el botón "Mi GPS" o el zoom.

const STEPS_PER_KM = 1 / 0.000762;

function computeDistanceKm(points: L.LatLng[]): number {
  let totalMeters = 0;
  for (let i = 1; i < points.length; i++) {
    totalMeters += points[i - 1].distanceTo(points[i]);
  }
  return totalMeters / 1000;
}

interface RouteDrawMapProps {
  darkMode: boolean;
  onRouteComplete: (result: { distanceKm: number; steps: number }) => void;
  heightClass?: string;
}

export const RouteDrawMap: React.FC<RouteDrawMapProps> = ({ darkMode, onRouteComplete, heightClass = "h-52" }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.CircleMarker | null>(null);
  const endMarkerRef = useRef<L.CircleMarker | null>(null);
  const pointsRef = useRef<L.LatLng[]>([]);
  const drawingRef = useRef(false);

  const [isDrawing, setIsDrawing] = useState(false);
  const [liveDistanceKm, setLiveDistanceKm] = useState(0);
  const [hasRoute, setHasRoute] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);

  const defaultLat = -31.5375;
  const defaultLon = -68.5364;

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const accentHex = getAccentColorHex();

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLon],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
    });

    L.control.zoom({ position: "topright" }).addTo(map);
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const clearLayers = () => {
      if (polylineRef.current) map.removeLayer(polylineRef.current);
      if (startMarkerRef.current) map.removeLayer(startMarkerRef.current);
      if (endMarkerRef.current) map.removeLayer(endMarkerRef.current);
      polylineRef.current = null;
      startMarkerRef.current = null;
      endMarkerRef.current = null;
    };

    const finalizeDraw = (lastPoint: L.LatLng) => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      setIsDrawing(false);
      const pts = pointsRef.current;
      if (pts.length < 2) {
        clearLayers();
        pointsRef.current = [];
        setHasRoute(false);
        setLiveDistanceKm(0);
        return;
      }
      endMarkerRef.current = L.circleMarker(lastPoint, {
        radius: 6,
        color: "#ffffff",
        weight: 2,
        fillColor: "#ef4444",
        fillOpacity: 1,
      }).addTo(map);
      const distanceKm = computeDistanceKm(pts);
      const steps = Math.round(distanceKm * STEPS_PER_KM);
      setLiveDistanceKm(distanceKm);
      setHasRoute(true);
      onRouteComplete({ distanceKm: Math.round(distanceKm * 100) / 100, steps });
    };

    const handleDown = (e: L.LeafletMouseEvent) => {
      clearLayers();
      drawingRef.current = true;
      pointsRef.current = [e.latlng];
      setIsDrawing(true);
      setHasRoute(false);
      setLiveDistanceKm(0);
      polylineRef.current = L.polyline([e.latlng], { color: accentHex, weight: 4, lineCap: "round" }).addTo(map);
      startMarkerRef.current = L.circleMarker(e.latlng, {
        radius: 6,
        color: "#ffffff",
        weight: 2,
        fillColor: accentHex,
        fillOpacity: 1,
      }).addTo(map);
    };

    const handleMove = (e: L.LeafletMouseEvent) => {
      if (!drawingRef.current || !polylineRef.current) return;
      const pts = pointsRef.current;
      const last = pts[pts.length - 1];
      if (last.distanceTo(e.latlng) < 4) return;
      pts.push(e.latlng);
      polylineRef.current.setLatLngs(pts);
      setLiveDistanceKm(computeDistanceKm(pts));
    };

    const handleUp = (e: L.LeafletMouseEvent) => finalizeDraw(e.latlng);

    const handleWindowUp = () => {
      if (!drawingRef.current) return;
      const pts = pointsRef.current;
      finalizeDraw(pts[pts.length - 1]);
    };

    map.on("mousedown", handleDown);
    map.on("mousemove", handleMove);
    map.on("mouseup", handleUp);
    window.addEventListener("mouseup", handleWindowUp);
    window.addEventListener("touchend", handleWindowUp);

    mapRef.current = map;

    const t1 = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 150);

    return () => {
      clearTimeout(t1);
      window.removeEventListener("mouseup", handleWindowUp);
      window.removeEventListener("touchend", handleWindowUp);
      try {
        map.off();
        map.remove();
      } catch {}
      mapRef.current = null;
      polylineRef.current = null;
      startMarkerRef.current = null;
      endMarkerRef.current = null;
      pointsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClearRoute = () => {
    const map = mapRef.current;
    if (map) {
      if (polylineRef.current) map.removeLayer(polylineRef.current);
      if (startMarkerRef.current) map.removeLayer(startMarkerRef.current);
      if (endMarkerRef.current) map.removeLayer(endMarkerRef.current);
    }
    polylineRef.current = null;
    startMarkerRef.current = null;
    endMarkerRef.current = null;
    pointsRef.current = [];
    setHasRoute(false);
    setLiveDistanceKm(0);
  };

  const handleGpsLocation = () => {
    if (!navigator.geolocation) return;
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingGps(false);
        mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 16);
      },
      () => setLocatingGps(false),
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const estimatedSteps = Math.round(liveDistanceKm * STEPS_PER_KM);

  return (
    <div>
      <p className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 mb-1.5">
        <Route className="w-3.5 h-3.5 shrink-0 text-primary" />
        Mantené presionado el punto de partida y arrastrá por las calles hasta el punto de llegada.
      </p>
      <div className="w-full rounded-2xl border border-primary/30 dark:border-primary/20 bg-slate-50 dark:bg-zinc-900/80 shadow-sm ring-1 ring-primary/10 p-2">
        <div className="relative w-full rounded-xl overflow-hidden">
          <div ref={mapContainerRef} className={`location-picker-map-tiles w-full ${heightClass} z-10 cursor-crosshair`} />

          {(isDrawing || hasRoute) && (
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-primary/30 dark:border-primary/20 rounded-full text-[10px] text-primary font-bold shadow-md">
              <Route className="w-3 h-3" />
              <span>
                {liveDistanceKm.toFixed(2)} km · ~{estimatedSteps} pasos
              </span>
            </div>
          )}

          {hasRoute && !isDrawing && (
            <button
              type="button"
              data-sound="delete"
              onClick={handleClearRoute}
              title="Borrar ruta"
              className="absolute top-2 right-2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-red-400/30 text-red-500 hover:bg-red-500 hover:text-white rounded-full text-[10px] font-bold shadow-md transition-all cursor-pointer"
            >
              <Eraser className="w-3 h-3" />
              <span>Borrar ruta</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleGpsLocation}
            disabled={locatingGps}
            title="Mi Ubicación GPS Actual"
            className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 px-3 py-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-primary/30 dark:border-primary/20 text-primary hover:bg-primary hover:text-white rounded-full text-[11px] font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 ring-1 ring-primary/10"
          >
            <Locate className={`w-3.5 h-3.5 ${locatingGps ? "animate-spin" : ""}`} />
            <span>Mi GPS</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteDrawMap;
