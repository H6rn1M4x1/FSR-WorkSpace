/**
 * Leagues/tournaments shown first in the Fútbol picker; clicking one drills down into its
 * clubs (from data/teams.ts — `id` here matches each Team's `league` field exactly).
 */
export interface FootballLeague {
  id: string;
  name: string;
  wikiTitle: string;
}

export const FOOTBALL_LEAGUES: FootballLeague[] = [
  { id: "Liga Profesional", name: "Liga Profesional Argentina", wikiTitle: "Argentine Primera División" },
  { id: "Premier League", name: "Premier League", wikiTitle: "Premier League" },
  { id: "LaLiga", name: "LaLiga", wikiTitle: "La Liga" },
  { id: "Serie A", name: "Serie A", wikiTitle: "Serie A" },
  { id: "Bundesliga", name: "Bundesliga", wikiTitle: "Bundesliga" },
  { id: "Ligue 1", name: "Ligue 1", wikiTitle: "Ligue 1" },
];
