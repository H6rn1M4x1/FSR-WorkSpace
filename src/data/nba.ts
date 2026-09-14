import { nbaLogoUrl } from "./nbaLogos";

/**
 * Static NBA roster so the team picker always renders instantly, without depending on a
 * network call succeeding first (that's what was leaving the picker empty). Logos come from
 * cdn.nba.com — the official, minimalist team marks, per request. Matching a followed team to
 * ESPN's schedule data happens by name (same technique as fútbol), not by ESPN's own team id.
 */
export interface NbaTeam {
  id: string; // abbreviation, stable and human-readable
  name: string;
  logo: string;
}

const NBA_TEAM_NAMES: [string, string][] = [
  ["ATL", "Atlanta Hawks"],
  ["BOS", "Boston Celtics"],
  ["BKN", "Brooklyn Nets"],
  ["CHA", "Charlotte Hornets"],
  ["CHI", "Chicago Bulls"],
  ["CLE", "Cleveland Cavaliers"],
  ["DAL", "Dallas Mavericks"],
  ["DEN", "Denver Nuggets"],
  ["DET", "Detroit Pistons"],
  ["GSW", "Golden State Warriors"],
  ["HOU", "Houston Rockets"],
  ["IND", "Indiana Pacers"],
  ["LAC", "LA Clippers"],
  ["LAL", "Los Angeles Lakers"],
  ["MEM", "Memphis Grizzlies"],
  ["MIA", "Miami Heat"],
  ["MIL", "Milwaukee Bucks"],
  ["MIN", "Minnesota Timberwolves"],
  ["NOP", "New Orleans Pelicans"],
  ["NYK", "New York Knicks"],
  ["OKC", "Oklahoma City Thunder"],
  ["ORL", "Orlando Magic"],
  ["PHI", "Philadelphia 76ers"],
  ["PHX", "Phoenix Suns"],
  ["POR", "Portland Trail Blazers"],
  ["SAC", "Sacramento Kings"],
  ["SAS", "San Antonio Spurs"],
  ["TOR", "Toronto Raptors"],
  ["UTA", "Utah Jazz"],
  ["WAS", "Washington Wizards"],
];

export const NBA_TEAMS: NbaTeam[] = NBA_TEAM_NAMES.map(([abbr, name]) => ({
  id: abbr,
  name,
  logo: nbaLogoUrl(abbr) || "",
}));
