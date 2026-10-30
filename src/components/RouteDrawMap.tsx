import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Locate, Eraser, Route, RefreshCw } from "lucide-react";
import { getAccentColorHex } from "./WeeklyScheduleGrid";

// Mapa para dibujar un recorrido a mano: mantener presionado marca el punto de partida, arrastrar
// va trazando la ruta, y soltar la ajusta a las calles reales (map-matching contra OSM vía el
// servicio público de FOSSGIS, sin API key) — si el ajuste falla (sin red, servicio caído), se
// simplifica el trazo a mano alzada con Douglas-Peucker, que igual deja líneas rectas entre los
// puntos de giro reales. Soltar no termina el dibujo: es una pausa — volver a presionar sigue
// agregando desde el último punto, hasta tocar "Borrar ruta". Calcula los km (sumando la
// distancia real del trazo ya ajustado, no la línea recta) y estima los pasos con la misma
// proporción que ya usa el resto de la app (km = pasos * 0.000762).

const STEPS_PER_KM = 1 / 0.000762;
const MATCH_MAX_POINTS = 90;
const SIMPLIFY_TOLERANCE_M = 10;

function computeDistanceKm(points: L.LatLng[]): number {
  let totalMeters = 0;
  for (let i = 1; i < points.length; i++) {
    totalMeters += points[i - 1].distanceTo(points[i]);
  }
  return totalMeters / 1000;
}

function samplePoints(points: L.LatLng[], maxCount: number): L.LatLng[] {
  if (points.length <= maxCount) return points;
  const step = (points.length - 1) / (maxCount - 1);
  const out: L.LatLng[] = [];
  for (let i = 0; i < maxCount; i++) {
    out.push(points[Math.round(i * step)]);
  }
  return out;
}

function perpendicularDistanceMeters(point: L.LatLng, lineStart: L.LatLng, lineEnd: L.LatLng): number {
  const x = point.lng, y = point.lat;
  const x1 = lineStart.lng, y1 = lineStart.lat;
  const x2 = lineEnd.lng, y2 = lineEnd.lat;
  const dx = x2 - x1, dy = y2 - y1;
  if (dx === 0 && dy === 0) return point.distanceTo(lineStart);
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return point.distanceTo(L.latLng(y1 + t * dy, x1 + t * dx));
}

// Simplifica un trazo a mano alzada a sus segmentos rectos reales (los puntos de giro), para que
// "se vean líneas rectas" incluso cuando el ajuste a calles no está disponible.
function douglasPeucker(points: L.LatLng[], toleranceMeters: number): L.LatLng[] {
  if (points.length < 3) return points;
  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const d = perpendicularDistanceMeters(points[i], points[0], points[end]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist > toleranceMeters) {
    const left = douglasPeucker(points.slice(0, index + 1), toleranceMeters);
    const right = douglasPeucker(points.slice(index), toleranceMeters);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[end]];
}

// Servicio público de ruteo peatonal de FOSSGIS (OpenStreetMap Alemania), gratis y sin API key —
// "map-matching" ajusta una serie de puntos sueltos al trazado real de calles/veredas más
// cercano. Si falla (sin red, servicio caído, trazo demasiado corto) devuelve null y el llamador
// usa douglasPeucker como respaldo.
async function snapToRoads(points: L.LatLng[]): Promise<L.LatLng[] | null> {
  if (points.length < 2) return null;
  const sampled = samplePoints(points, MATCH_MAX_POINTS);
  const coords = sampled.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(";");
  const radiuses = sampled.map(() => "25").join(";");
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `https://routing.openstreetmap.de/routed-foot/match/v1/foot/${coords}?geometries=geojson&overview=full&radiuses=${radiuses}`,
      { signal: controller.signal },
    );
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    const coordsOut = data?.matchings?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coordsOut) || coordsOut.length < 2) return null;
    return coordsOut.map((c: [number, number]) => L.latLng(c[1], c[0]));
  } catch {
    return null;
  }
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
  const hasRouteRef = useRef(false);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
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

    const finalizeDraw = async (lastPoint: L.LatLng) => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      setIsDrawing(false);

      const pts = pointsRef.current;
      if (pts.length < 2) {
        if (!hasRouteRef.current) {
          clearLayers();
          pointsRef.current = [];
          setLiveDistanceKm(0);
        }
        return;
      }

      setIsSnapping(true);
      const snapped = await snapToRoads(pts);
      setIsSnapping(false);
      const finalPoints = snapped || douglasPeucker(pts, SIMPLIFY_TOLERANCE_M);
      pointsRef.current = finalPoints;

      if (polylineRef.current) map.removeLayer(polylineRef.current);
      polylineRef.current = L.polyline(finalPoints, { color: accentHex, weight: 4, lineCap: "round", lineJoin: "round" }).addTo(map);

      if (endMarkerRef.current) map.removeLayer(endMarkerRef.current);
      endMarkerRef.current = L.circleMarker(finalPoints[finalPoints.length - 1], {
        radius: 6,
        color: "#ffffff",
        weight: 2,
        fillColor: "#ef4444",
        fillOpacity: 1,
      }).addTo(map);

      const distanceKm = computeDistanceKm(finalPoints);
      const steps = Math.round(distanceKm * STEPS_PER_KM);
      hasRouteRef.current = true;
      setLiveDistanceKm(distanceKm);
      setHasRoute(true);
      onRouteComplete({ distanceKm: Math.round(distanceKm * 100) / 100, steps });
    };

    const handleDown = (e: L.LeafletMouseEvent) => {
      if (!hasRouteRef.current) {
        clearLayers();
        pointsRef.current = [];
      } else if (endMarkerRef.current) {
        map.removeLayer(endMarkerRef.current);
        endMarkerRef.current = null;
      }
      drawingRef.current = true;
      pointsRef.current = [...pointsRef.current, e.latlng];
      setIsDrawing(true);

      if (!polylineRef.current) {
        polylineRef.current = L.polyline(pointsRef.current, { color: accentHex, weight: 4, lineCap: "round" }).addTo(map);
      } else {
        polylineRef.current.setLatLngs(pointsRef.current);
      }
      if (!startMarkerRef.current) {
        startMarkerRef.current = L.circleMarker(pointsRef.current[0], {
          radius: 6,
          color: "#ffffff",
          weight: 2,
          fillColor: accentHex,
          fillOpacity: 1,
        }).addTo(map);
      }
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

    const handleUp = (e: L.LeafletMouseEvent) => {
      finalizeDraw(e.latlng);
    };

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
      hasRouteRef.current = false;
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
    hasRouteRef.current = false;
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
        Mantené presionado el punto de partida y arrastrá hasta el de llegada. Podés soltar y
        volver a presionar para seguir dibujando desde ahí.
      </p>
      <div className="w-full rounded-2xl border border-primary/30 dark:border-primary/20 bg-slate-50 dark:bg-zinc-900/80 shadow-sm ring-1 ring-primary/10 p-2">
        <div className="relative w-full rounded-xl overflow-hidden">
          <div ref={mapContainerRef} className={`location-picker-map-tiles w-full ${heightClass} z-10 cursor-crosshair`} />

          {isSnapping && (
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-primary/30 dark:border-primary/20 rounded-full text-[10px] text-primary font-bold shadow-md">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Ajustando a las calles...</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGpsLocation}
            disabled={locatingGps}
            title="Mi Ubicación GPS Actual"
            className="absolute bottom-2 right-2 z-20 flex items-center justify-center p-2.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-primary/30 dark:border-primary/20 text-primary hover:bg-primary hover:text-white rounded-full shadow-md transition-all cursor-pointer disabled:opacity-50 ring-1 ring-primary/10"
          >
            <Locate className={`w-3.5 h-3.5 ${locatingGps ? "animate-spin" : ""}`} />
          </button>
        </div>

        {(isDrawing || hasRoute) && (
          <div className="flex items-center justify-between gap-2 mt-2 px-0.5">
            <span className="flex items-center gap-1.5 text-[11px] text-primary font-bold">
              <Route className="w-3.5 h-3.5 shrink-0" />
              {liveDistanceKm.toFixed(2)} km · ~{estimatedSteps} pasos
            </span>
            {hasRoute && !isDrawing && (
              <button
                type="button"
                data-sound="delete"
                onClick={handleClearRoute}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-red-500 hover:bg-red-500/10 rounded-full text-[11px] font-bold transition-all cursor-pointer"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Borrar ruta</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteDrawMap;
