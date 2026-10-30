import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Locate, RefreshCw } from "lucide-react";

interface LocationPickerMapProps {
  lat?: number;
  lon?: number;
  locationName?: string;
  onSelectLocation?: (location: {
    lat: number;
    lon: number;
    address?: string;
    title?: string;
    display_name?: string;
  }) => void;
  heightClass?: string;
  // Modo de solo-visualización (p.ej. modales de detalle): oculta "Mi GPS" y el banner de
  // instrucciones, y deshabilita arrastrar el marcador / click en el mapa para mover el punto.
  readOnly?: boolean;
}

// Fix Leaflet default marker icon path issue in bundled environments
const customIcon = L.divIcon({
  className: "custom-osm-marker",
  html: `<div style="
    background: var(--color-primary, #1a73e8);
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 14px var(--color-primary, rgba(26, 115, 232, 0.5));
    border: 2.5px solid white;
  ">
    <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
      <div style="width: 10px; height: 10px; background: white; border-radius: 50%; box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);"></div>
    </div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  lat,
  lon,
  locationName,
  onSelectLocation,
  heightClass = "h-52",
  readOnly = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [loading, setLoading] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "terrain">("roadmap");
  const [embedMode, setEmbedMode] = useState(false);

  // Default to San Juan, Argentina
  const defaultLat = -31.5375;
  const defaultLon = -68.5364;

  const currentLat = lat && !isNaN(lat) ? lat : defaultLat;
  const currentLon = lon && !isNaN(lon) ? lon : defaultLon;

  // OSM-based Tile URLs based on selected mapType. "roadmap" había pasado a usar las baldosas de
  // CARTO Voyager para un estilo más claro, pero CARTO ahora exige una API key incluso para ese
  // endpoint (antes era gratis y sin key) — sin key, las baldosas llegan con un watermark enorme
  // de "API KEY REQUIRED" tapando el mapa entero. Investigado a fondo (ver github.com/CartoDB/
  // basemap-styles y docs de Stadia Maps/OpenFreeMap): no hay ningún proveedor de baldosas
  // RASTER realmente gratuito y sin key con estilo claro — las únicas alternativas gratis y sin
  // key sin API key son vectoriales (OpenFreeMap), que requerirían sumar MapLibre GL como
  // dependencia nueva. Por ahora se vuelve a las baldosas estándar de OSM (gratis, sin key, ya
  // probadas en producción) y el aclarado visual se logra con un filtro CSS en vez de cambiar de
  // proveedor — ver la clase "location-picker-map-tiles" en index.css.
  const getOSMTileUrl = (type: "roadmap" | "satellite" | "terrain") => {
    switch (type) {
      case "satellite":
        return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
      case "terrain":
        return "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png";
      case "roadmap":
      default:
        return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    }
  };

  const getTileAttribution = (type: "roadmap" | "satellite" | "terrain") => {
    switch (type) {
      case "satellite":
        return "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";
      case "terrain":
        return "Map data: &copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors, <a href=\"http://viewfinderpanoramas.org\">SRTM</a> | Map style: &copy; <a href=\"https://opentopomap.org\">OpenTopoMap</a> (<a href=\"https://creativecommons.org/licenses/by-sa/3.0/\">CC-BY-SA</a>)";
      case "roadmap":
      default:
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    }
  };

  // Reverse geocode helper
  const handleReverseGeocode = async (targetLat: number, targetLon: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reverse-geocode?lat=${targetLat}&lon=${targetLon}`);
      if (res.ok) {
        const data = await res.json();
        onSelectLocation?.({
          lat: targetLat,
          lon: targetLon,
          address: data.address || data.display_name,
          title: data.title,
          display_name: data.display_name,
        });
      } else {
        onSelectLocation?.({
          lat: targetLat,
          lon: targetLon,
          display_name: `${targetLat.toFixed(5)}, ${targetLon.toFixed(5)}`,
        });
      }
    } catch (err) {
      console.warn("Reverse geocode failed:", err);
      onSelectLocation?.({
        lat: targetLat,
        lon: targetLon,
        display_name: `${targetLat.toFixed(5)}, ${targetLon.toFixed(5)}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || embedMode) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [currentLat, currentLon],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
        // Con la rueda del mouse habilitada, hacer scroll de la página mientras el cursor pasa
        // por encima del mapa termina haciendo zoom en vez de bajar — atrapa el scroll del
        // formulario que lo contiene (p.ej. Ajustes & Configuración). Los botones +/- y el pellizco
        // táctil siguen andando, así que no se pierde la forma de hacer zoom, solo la rueda.
        scrollWheelZoom: false,
      });

      // Add Zoom control in top right
      L.control.zoom({ position: "topright" }).addTo(map);

      // Atribución propia, chica y discreta (abajo a la izquierda, donde antes estaba el banner
      // de instrucciones que se sacó) — Leaflet y OpenStreetMap exigen mostrar la atribución para
      // poder usar sus baldosas gratis, así que no se puede sacar del todo, pero sí hacerla mucho
      // menos protagonista que la que trae Leaflet por default.
      L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);

      // OpenStreetMap Tile Layer
      const tileLayer = L.tileLayer(getOSMTileUrl(mapType), {
        maxZoom: 20,
        attribution: getTileAttribution(mapType),
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // OpenStreetMap Marker
      const marker = L.marker([currentLat, currentLon], {
        icon: customIcon,
        draggable: !readOnly,
      }).addTo(map);

      if (locationName) {
        marker.bindTooltip(locationName, { permanent: false, direction: "top" });
      }

      if (!readOnly) {
        // On marker drag end
        marker.on("dragend", (e: any) => {
          const position = e.target.getLatLng();
          handleReverseGeocode(position.lat, position.lng);
        });

        // On map click
        map.on("click", (e: L.LeafletMouseEvent) => {
          const { lat: clickedLat, lng: clickedLon } = e.latlng;
          marker.setLatLng([clickedLat, clickedLon]);
          handleReverseGeocode(clickedLat, clickedLon);
        });
      }

      mapRef.current = map;
      markerRef.current = marker;

      // Force size invalidation for proper tile rendering
      const t1 = setTimeout(() => {
        if (mapRef.current) {
          try {
            mapRef.current.invalidateSize();
          } catch {}
        }
      }, 150);
      const t2 = setTimeout(() => {
        if (mapRef.current) {
          try {
            mapRef.current.invalidateSize();
          } catch {}
        }
      }, 400);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        if (mapRef.current) {
          try {
            mapRef.current.stop();
            mapRef.current.off();
            mapRef.current.remove();
          } catch (e) {
            console.warn("Leaflet cleanup:", e);
          }
          mapRef.current = null;
          markerRef.current = null;
          tileLayerRef.current = null;
        }
      };
    }
  }, [embedMode]);

  // Handle map layer switch (Roadmap vs Satellite vs Terrain)
  const changeMapType = (newType: "roadmap" | "satellite" | "terrain") => {
    setMapType(newType);
    if (mapRef.current && tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
      const newLayer = L.tileLayer(getOSMTileUrl(newType), {
        maxZoom: 20,
        attribution: getTileAttribution(newType),
      }).addTo(mapRef.current);
      tileLayerRef.current = newLayer;
    }
  };

  // Update map center & marker when lat/lon props change from external place search
  useEffect(() => {
    if (mapRef.current && markerRef.current && lat && lon) {
      const map = mapRef.current;
      const marker = markerRef.current;

      marker.setLatLng([lat, lon]);
      map.setView([lat, lon], Math.max(map.getZoom(), 15));

      if (locationName) {
        marker.unbindTooltip();
        marker.bindTooltip(locationName, { permanent: false, direction: "top" });
      }

      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
  }, [lat, lon, locationName]);

  // Handle GPS location click
  const handleGpsLocation = () => {
    if (!navigator.geolocation) {
      alert("La geolocalización no está soportada por su navegador.");
      return;
    }

    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLon = pos.coords.longitude;
        setLocatingGps(false);

        if (mapRef.current && markerRef.current) {
          markerRef.current.setLatLng([userLat, userLon]);
          mapRef.current.setView([userLat, userLon], 16);
        }

        handleReverseGeocode(userLat, userLon);
      },
      (err) => {
        setLocatingGps(false);
        console.warn("GPS error:", err);
        alert("No se pudo obtener su ubicación actual GPS. Por favor seleccione un punto en el mapa.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="w-full rounded-2xl border border-primary/30 dark:border-primary/20 bg-slate-50 dark:bg-zinc-900/80 shadow-sm transition-all mt-2 ring-1 ring-primary/10 p-2">
      {/* Map Canvas / View — con este padding alrededor, el mapa queda "enmarcado" dentro de la
          cápsula en vez de pegado a su borde redondeado (antes los controles de zoom, pegados a
          la esquina, se veían cortados por el redondeo exterior). */}
      <div className="relative w-full rounded-xl overflow-hidden">
        {embedMode ? (
          <div className={`w-full ${heightClass} bg-slate-100 dark:bg-zinc-900`}>
            <iframe
              title="OpenStreetMap Location View"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${currentLon-0.01}%2C${currentLat-0.005}%2C${currentLon+0.01}%2C${currentLat+0.005}&layer=mapnik&marker=${currentLat}%2C${currentLon}`}
            />
          </div>
        ) : (
          <div ref={mapContainerRef} className={`location-picker-map-tiles w-full ${heightClass} z-10 ${readOnly ? "" : "cursor-crosshair"}`} />
        )}

        {/* "Mi GPS" flota sobre el mapa (antes vivía en una barra de herramientas arriba, ahora
            removida junto con la etiqueta "OpenStreetMap" y el botón "Abrir OpenStreetMap"). */}
        {!embedMode && !readOnly && (
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
        )}

        {/* Indicador de carga (geocodificación inversa al mover el marcador) */}
        {!embedMode && loading && (
          <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-primary/30 dark:border-primary/20 rounded-full text-[10px] text-primary font-bold shadow-md animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Obteniendo dirección...</span>
          </div>
        )}

      </div>
    </div>
  );
};
