import type { SportCatalogEntry } from "../types";

export const SPORTS_CATALOG: SportCatalogEntry[] = [
  { id: "f1", label: "Fórmula 1" },
  { id: "motogp", label: "MotoGP" },
  { id: "futbol", label: "Fútbol" },
  { id: "tenis", label: "Tenis" },
  { id: "nba", label: "NBA" },
  { id: "nfl", label: "NFL" },
];

export function getSportById(id: string): SportCatalogEntry | undefined {
  return SPORTS_CATALOG.find((s) => s.id === id);
}
