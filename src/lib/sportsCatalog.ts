import type { SportCatalogEntry } from "../types";

export const SPORTS_CATALOG: SportCatalogEntry[] = [
  { id: "f1", label: "Fórmula 1" },
  { id: "futbol", label: "Fútbol" },
  { id: "nba", label: "NBA" },
];

export function getSportById(id: string): SportCatalogEntry | undefined {
  return SPORTS_CATALOG.find((s) => s.id === id);
}
