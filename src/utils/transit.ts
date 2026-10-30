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
// maxWalkKm es generoso (los departamentos de Gran San Juan son grandes y el dataset solo tiene
// 2-5 paradas por línea, no el recorrido completo calle por calle) — de todas formas solo se
// listan líneas con cobertura en ambas puntas, nunca "la más cercana nomás".
export function findConnectingTransitLines(
  homeLat: number,
  homeLon: number,
  destLat: number,
  destLon: number,
  maxWalkKm = 3,
  limit = 6
): ConnectingTransitLine[] {
  const results: ConnectingTransitLine[] = [];
  RED_TULUM_LINES.forEach((line) => {
    const home = nearestStop(line.stops, homeLat, homeLon);
    const dest = nearestStop(line.stops, destLat, destLon);
    if (!home || !dest) return;
    if (home.distanceKm > maxWalkKm || dest.distanceKm > maxWalkKm) return;
    results.push({
      code: line.code,
      line: line.line,
      description: line.description,
      homeStop: home.stop,
      homeDistanceKm: home.distanceKm,
      destStop: dest.stop,
      destDistanceKm: dest.distanceKm,
    });
  });
  return results.sort((a, b) => a.homeDistanceKm + a.destDistanceKm - (b.homeDistanceKm + b.destDistanceKm)).slice(0, limit);
}
