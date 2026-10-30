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

export interface NearestTransitResult {
  line: string;
  description: string;
  stop: TransitStop;
  distanceKm: number;
}

// Para cada línea de Red Tulum, busca su parada más cercana al punto dado y devuelve las N
// líneas con la parada más próxima, ordenadas de más cerca a más lejos.
export function findNearestTransitLines(lat: number, lon: number, limit = 3): NearestTransitResult[] {
  const results: NearestTransitResult[] = RED_TULUM_LINES.map((line) => {
    let nearestStop: TransitStop | null = null;
    let nearestDist = Infinity;
    line.stops.forEach((stop) => {
      const d = haversineKm(lat, lon, stop.lat, stop.lon);
      if (d < nearestDist) {
        nearestDist = d;
        nearestStop = stop;
      }
    });
    return nearestStop ? { line: line.line, description: line.description, stop: nearestStop, distanceKm: nearestDist } : null;
  }).filter((r): r is NearestTransitResult => r !== null);

  return results.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit);
}
