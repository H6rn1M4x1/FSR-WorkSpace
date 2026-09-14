import type { SportCatalogEntry } from "../types";

/**
 * Fixed catalog of sports the user can follow. `sportsDbSport`/`leagueQuery` are used to
 * resolve the actual TheSportsDB league id at runtime (via the server's
 * /api/sportsdb/search-league proxy) instead of hardcoding numeric ids, which drift/vary.
 */
export const SPORTS_CATALOG: SportCatalogEntry[] = [
  { id: "f1", label: "Fórmula 1", hasTeams: true, sportsDbSport: "Motorsport", leagueQuery: "Formula 1" },
  { id: "motogp", label: "MotoGP", hasTeams: true, sportsDbSport: "Motorsport", leagueQuery: "MotoGP" },
  { id: "futbol", label: "Fútbol", hasTeams: true, sportsDbSport: "Soccer", leagueQuery: "Argentina" },
  { id: "tenis", label: "Tenis", hasTeams: false, sportsDbSport: "Tennis", leagueQuery: "ATP" },
  { id: "nba", label: "NBA", hasTeams: true, sportsDbSport: "Basketball", leagueQuery: "NBA" },
  { id: "nfl", label: "NFL", hasTeams: true, sportsDbSport: "American Football", leagueQuery: "NFL" },
  { id: "wwe", label: "WWE", hasTeams: true, sportsDbSport: "Wrestling", leagueQuery: "WWE Raw" },
  { id: "ufc", label: "UFC", hasTeams: false, sportsDbSport: "Fighting", leagueQuery: "UFC" },
];

export function getSportById(id: string): SportCatalogEntry | undefined {
  return SPORTS_CATALOG.find((s) => s.id === id);
}
