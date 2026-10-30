import { RED_TULUM_LINES, TransitStop } from "../data/redTulumLines";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function nearestStop(stops: TransitStop[], lat: number, lon: number): { stop: TransitStop; distanceKm: number } | null {
  let nearest: TransitStop | null = null;
  let nearestDist = Infinity;
  stops.forEach((stop) => {
    const d = haversineKm(lat, lon, stop.lat, stop.lon);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = stop;
    }
  });
  return nearest ? { stop: nearest, distanceKm: nearestDist } : null;
}

export interface ConnectingTransitLine {
  code: string;
  line: string;
  description: string;
  homeStop: TransitStop;
  homeDistanceKm: number;
  destStop: TransitStop;
  destDistanceKm: number;
}

// Solo devuelve líneas cuyo recorrido (según las paradas principales que tenemos de cada una,
// ver src/data/redTulumLines.ts) pasa razonablemente cerca TANTO de "casa" como del destino — no
// alcanza con que una parada cualquiera de la línea quede cerca del destino, tiene que haber otra
// parada de esa misma línea cerca de home también, así se respeta el recorrido real en vez de
// sugerir una línea que simplemente tiene UNA parada cerca del destino pero nunca pasa por casa.
//
// El radio de "cerca" escala en vez de ser fijo: arranca en 1.5km (una caminata razonable hasta
// una parada) y, SOLO si con eso no aparece ninguna línea, lo va agrandando (2.5km, luego 4km)
// hasta encontrar algo — así, para un destino en el microcentro (con varias paradas a pocas
// cuadras) se queda con el radio chico y preciso, pero para un destino lejos de cualquier parada
// del dataset (que es chico, no cubre toda Gran San Juan) igual se muestra la mejor opción
// disponible en vez de no mostrar nada.
const WALK_RADII_KM = [1.5, 2.5, 4];

export function findConnectingTransitLines(
  homeLat: number,
  homeLon: number,
  destLat: number,
  destLon: number,
  limit = 4
): ConnectingTransitLine[] {
  const candidates: ConnectingTransitLine[] = [];
  RED_TULUM_LINES.forEach((line) => {
    const home = nearestStop(line.stops, homeLat, homeLon);
    const dest = nearestStop(line.stops, destLat, destLon);
    if (!home || !dest) return;
    candidates.push({
      code: line.code,
      line: line.line,
      description: line.description,
      homeStop: home.stop,
      homeDistanceKm: home.distanceKm,
      destStop: dest.stop,
      destDistanceKm: dest.distanceKm,
    });
  });
  candidates.sort((a, b) => a.homeDistanceKm + a.destDistanceKm - (b.homeDistanceKm + b.destDistanceKm));

  for (const maxWalkKm of WALK_RADII_KM) {
    const matches = candidates.filter((c) => c.homeDistanceKm <= maxWalkKm && c.destDistanceKm <= maxWalkKm);
    if (matches.length > 0) return matches.slice(0, limit);
  }
  return [];
}
