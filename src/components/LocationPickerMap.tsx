import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapPin, Navigation, ExternalLink, Locate, RefreshCw } from "lucide-react";

interface LocationPickerMapProps {
  lat?: number;
  lon?: number;
  locationName?: string;
  onSelectLocation: (location: {
    lat: number;
    lon: number;
    address?: string;
    title?: string;
    display_name?: string;
  }) => void;
  heightClass?: string;
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

  // OpenStreetMap/OSM-based Tile URLs based on selected mapType
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
        onSelectLocation({
          lat: targetLat,
          lon: targetLon,
          address: data.address || data.display_name,
          title: data.title,
          display_name: data.display_name,
        });
      } else {
        onSelectLocation({
          lat: targetLat,
          lon: targetLon,
          display_name: `${targetLat.toFixed(5)}, ${targetLon.toFixed(5)}`,
        });
      }
    } catch (err) {
      console.warn("Reverse geocode failed:", err);
      onSelectLocation({
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
      });

      // Add Zoom control in top right
      L.control.zoom({ position: "topright" }).addTo(map);

      // OpenStreetMap Tile Layer
      const tileLayer = L.tileLayer(getOSMTileUrl(mapType), {
        maxZoom: 20,
        attribution: getTileAttribution(mapType),
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // OpenStreetMap Marker
      const marker = L.marker([currentLat, currentLon], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      if (locationName) {
        marker.bindTooltip(locationName, { permanent: false, direction: "top" });
      }

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
    <div className="w-full rounded-2xl overflow-hidden border border-primary/30 dark:border-primary/20 bg-slate-50 dark:bg-zinc-900/80 shadow-sm transition-all mt-2 ring-1 ring-primary/10">
      {/* Map Header & Toolbar */}
      <div className="px-3 py-2 bg-primary/10 dark:bg-primary/15 border-b border-primary/20 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-zinc-200">
          <MapPin className="w-3.5 h-3.5 text-primary fill-primary/20" />
          <span className="font-bold text-primary dark:text-primary">OpenStreetMap</span>
          {loading && (
            <span className="flex items-center gap-1 text-[10px] text-primary font-normal animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Obteniendo dirección...
            </span>
          )}
        </div>

        {/* Map Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleGpsLocation}
            disabled={locatingGps}
            title="Mi Ubicación GPS Actual"
            className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-zinc-900 border border-primary/30 text-primary hover:bg-primary hover:text-white rounded-lg text-[10px] font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Locate className={`w-3.5 h-3.5 ${locatingGps ? "animate-spin text-primary" : "text-primary"}`} />
            <span>Mi GPS</span>
          </button>

          {lat && lon && (
            <a
              href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir en OpenStreetMap Oficial"
              className="flex items-center gap-1 px-2.5 py-1 bg-primary text-white dark:text-slate-950 hover:bg-primary-hover rounded-lg text-[10px] font-bold shadow-xs transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir OpenStreetMap</span>
            </a>
          )}
        </div>
      </div>

      {/* Map Canvas / View */}
      <div className="relative w-full">
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
          <div ref={mapContainerRef} className={`w-full ${heightClass} z-10 cursor-crosshair`} />
        )}

        {/* Floating Instruction Banner */}
        {!embedMode && (
          <div className="absolute bottom-2 left-2 z-20 px-2.5 py-1 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-primary/30 dark:border-primary/20 rounded-xl text-[10px] text-slate-800 dark:text-zinc-100 font-semibold shadow-md flex items-center gap-1.5 pointer-events-none ring-1 ring-primary/20 map-instruction-banner">
            <Navigation className="w-3 h-3 text-primary animate-bounce fill-primary/20" />
            <span>Haz clic o arrastra el marcador para fijar la ubicación exacta</span>
          </div>
        )}
      </div>
    </div>
  );
};
