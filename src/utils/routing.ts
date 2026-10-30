// Ruta calle por calle entre dos puntos vía el servicio público de OSRM (perfil "driving").
// Usado tanto por el Mapa de Localizaciones Programadas (AppointmentsView) como por la vista
// previa de mapa al cargar un Turno/Compromiso (LocationPickerMap), para que ambos dibujen el
// mismo tipo de ruta animada hogar → destino.
export async function fetchStreetRoute(
  homeLat: number,
  homeLon: number,
  lat: number,
  lon: number,
): Promise<[number, number][] | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${homeLon},${homeLat};${lon},${lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const coords = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    return coords.map(([lo, la]: [number, number]) => [la, lo] as [number, number]);
  } catch {
    return null;
  }
}
