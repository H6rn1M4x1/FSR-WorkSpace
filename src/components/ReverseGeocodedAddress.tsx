import { useEffect, useState } from "react";

/**
 * Segunda línea de texto bajo el nombre de un lugar (p. ej. debajo de "Global Salud"), con la
 * calle/dirección obtenida por geocodificación inversa de lat/lon — el Turno solo guarda un
 * nombre de lugar corto, pero sí guarda las coordenadas, así que la dirección se calcula sola en
 * vez de pedirle al usuario que la tipee de nuevo. Se cachea en memoria por par lat/lon para no
 * recalcular si el mismo modal se vuelve a abrir en la misma sesión.
 */
const cache = new Map<string, string>();

export function ReverseGeocodedAddress({
  lat,
  lon,
  className = "text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate",
}: {
  lat?: number;
  lon?: number;
  className?: string;
}) {
  const hasCoords =
    typeof lat === "number" && typeof lon === "number" && !isNaN(lat) && !isNaN(lon) && !(lat === 0 && lon === 0);
  const key = hasCoords ? `${lat!.toFixed(5)},${lon!.toFixed(5)}` : "";
  const [address, setAddress] = useState<string | null>(hasCoords ? cache.get(key) || null : null);

  useEffect(() => {
    if (!hasCoords) {
      setAddress(null);
      return;
    }
    if (cache.has(key)) {
      setAddress(cache.get(key)!);
      return;
    }
    let cancelled = false;
    fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.address) return;
        cache.set(key, data.address);
        setAddress(data.address);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hasCoords]);

  if (!address) return null;
  return <span className={className}>{address}</span>;
}

export default ReverseGeocodedAddress;
