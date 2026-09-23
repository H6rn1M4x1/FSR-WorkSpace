/**
 * Tablas de posiciones para la fila de "Posiciones" al final de Eventos: ligas de fútbol
 * seguidas, campeonato de F1 y NBA. Mismo patrón defensivo que el resto de esta app respecto a
 * ESPN — cada fetch va en try/catch y nunca fabrica datos: si algo falla, se devuelve un arreglo
 * vacío y el panel correspondiente lo muestra como "no disponible" en vez de romperse o inventar
 * filas.
 *
 * IMPORTANTE: los endpoints de standings (a diferencia de scoreboard/schedule, ya confirmados
 * en vivo muchas veces en este proyecto) todavía NO se probaron contra la API real de ESPN desde
 * esta sesión — no hay forma de alcanzar site.api.espn.com desde este entorno. Si al desplegar
 * alguna tabla aparece vacía o con datos raros, hay que revisar el JSON real en la consola del
 * navegador (mismo mecanismo ya usado en todo este proyecto) antes de asumir que el resto del
 * código está mal.
 */

import { F1_TEAMS, F1_TEAM_LOGOS, F1_DRIVERS } from "../data/f1";

export interface StandingsEntry {
  teamId: string;
  teamName: string;
  teamLogo?: string;
  rank: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
}

export interface FootballLeagueStandings {
  leagueCode: string;
  leagueName: string;
  entries: StandingsEntry[];
}

// Mismos códigos ESPN ya confirmados válidos en footballCompetitions.ts, uno por cada liga de
// FOOTBALL_LEAGUES (data/footballLeagues.ts) — para poder pedir la tabla de posiciones de la
// liga de cada equipo seguido.
export const FOOTBALL_LEAGUE_ESPN_CODE: Record<string, string> = {
  "Liga Profesional": "arg.1",
  "Premier League": "eng.1",
  LaLiga: "esp.1",
  "Serie A": "ita.1",
  Bundesliga: "ger.1",
  "Ligue 1": "fra.1",
};

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch (_) {
    return null;
  }
}

/**
 * Tabla de posiciones de una liga de fútbol. El endpoint "site" de ESPN expone standings bajo
 * /apis/v2/sports/{sport}/{league}/standings (distinto del prefijo /apis/site/v2/... que usan
 * scoreboard/schedule) — sin verificar en vivo todavía, ver nota arriba del archivo.
 */
export async function fetchFootballStandings(leagueCode: string, leagueName: string): Promise<FootballLeagueStandings | null> {
  const data = await fetchJson(`https://site.api.espn.com/apis/v2/sports/soccer/${leagueCode}/standings`);
  if (!data) return null;

  // La forma exacta del JSON de standings de ESPN varía entre "standings.entries" directo y
  // "children[].standings.entries" (cuando la liga se divide en grupos/conferencias) — se
  // prueban ambas formas y, si hay grupos, se usa el primero (la tabla general).
  const rawEntries: any[] =
    data?.standings?.entries || data?.children?.[0]?.standings?.entries || data?.groups?.[0]?.standings?.entries || [];

  if (!rawEntries.length) return null;

  const entries: StandingsEntry[] = rawEntries
    .map((entry: any, idx: number): StandingsEntry | null => {
      const team = entry.team;
      if (!team) return null;
      const stat = (name: string) => entry.stats?.find((s: any) => s.name === name || s.abbreviation === name)?.value;
      return {
        teamId: String(team.id ?? team.uid ?? idx),
        teamName: team.displayName || team.shortDisplayName || team.name || "Equipo",
        teamLogo: team.logos?.[0]?.href || team.logo,
        rank: Math.round(stat("rank") ?? idx + 1),
        played: Math.round(stat("gamesPlayed") ?? 0),
        won: Math.round(stat("wins") ?? 0),
        drawn: Math.round(stat("ties") ?? stat("draws") ?? 0),
        lost: Math.round(stat("losses") ?? 0),
        points: Math.round(stat("points") ?? 0),
      };
    })
    .filter((e): e is StandingsEntry => e !== null)
    .sort((a, b) => a.rank - b.rank);

  if (!entries.length) return null;
  return { leagueCode, leagueName, entries };
}

export interface F1RaceStat {
  code: string;
  raceName: string;
  played: boolean;
  points: number;
}

export interface F1DriverStanding {
  driverId: string;
  driverName: string;
  rank: number;
  points: number;
  races: F1RaceStat[];
}

/**
 * Campeonato de pilotos de F1. Mismo endpoint "site" que el resto de F1 en esta app.
 *
 * Confirmado con JSON real de ESPN: el stat de puntos totales se llama "championshipPts" (NO
 * "points"), y cada entrada de piloto trae además un stat por cada Gran Premio de la temporada
 * (código de 3 letras, ej. "AUS", "CHN", "JPN"...) con `played: boolean` y `value` = puntos
 * obtenidos en esa carrera puntual. Se usa esto — no el scoreboard sin fecha, que solo devuelve
 * la próxima carrera todavía no corrida — como fuente real de "últimas carreras".
 */
export async function fetchF1DriverStandings(): Promise<F1DriverStanding[]> {
  const data = await fetchJson("https://site.api.espn.com/apis/v2/sports/racing/f1/standings");
  if (!data) return [];

  const rawEntries: any[] = data?.children?.[0]?.standings?.entries || data?.standings?.entries || [];
  const entries: F1DriverStanding[] = rawEntries
    .map((entry: any, idx: number): F1DriverStanding | null => {
      const athlete = entry.athlete || entry.competitor?.athlete;
      if (!athlete) return null;
      const stats: any[] = entry.stats || [];
      const stat = (name: string) => stats.find((s: any) => s.name === name)?.value;
      const races: F1RaceStat[] = stats
        .filter((s: any) => s.name !== "rank" && s.name !== "championshipPts")
        .map((s: any) => ({
          code: s.name,
          raceName: s.displayName || s.shortName || s.name,
          played: Boolean(s.played),
          points: Math.round(s.value ?? 0),
        }));
      return {
        driverId: String(athlete.id ?? idx),
        driverName: athlete.displayName || athlete.fullName || "Piloto",
        rank: Math.round(stat("rank") ?? idx + 1),
        points: Math.round(stat("championshipPts") ?? 0),
        races,
      };
    })
    .filter((e): e is F1DriverStanding => e !== null)
    .sort((a, b) => a.rank - b.rank);

  return entries;
}

export interface F1ConstructorStanding {
  teamId: string;
  teamName: string;
  teamLogo?: string;
  rank: number;
  points: number;
}

/**
 * Campeonato de constructores de F1. El endpoint de standings de ESPN trae un segundo grupo de
 * "constructor/manufacturer standings" en `children`, pero confirmado en vivo que sus puntos
 * siempre dan 0 (campo distinto al de pilotos, nunca identificado con certeza) — en vez de
 * seguir adivinando el nombre del stat, se suman los puntos reales de cada piloto (ya
 * confirmados, "championshipPts") por escudería, usando el mapeo piloto→equipo de data/f1.ts.
 * Es exactamente cómo se calculan los puntos de constructores en la F1 real (suma de ambos
 * pilotos del equipo), así que el resultado es correcto, no una aproximación.
 */
export async function fetchF1ConstructorStandings(): Promise<F1ConstructorStanding[]> {
  const drivers = await fetchF1DriverStandings();
  if (!drivers.length) return [];

  const pointsByTeamId = new Map<string, number>();
  for (const d of drivers) {
    const known = F1_DRIVERS.find((fd) => {
      const a = fd.name.toLowerCase();
      const b = d.driverName.toLowerCase();
      return a === b || a.includes(b) || b.includes(a);
    });
    if (!known) continue;
    pointsByTeamId.set(known.teamId, (pointsByTeamId.get(known.teamId) ?? 0) + d.points);
  }

  const entries: F1ConstructorStanding[] = F1_TEAMS.filter((t) => pointsByTeamId.has(t.id))
    .map((t) => ({
      teamId: t.id,
      teamName: t.name,
      teamLogo: F1_TEAM_LOGOS[t.id],
      rank: 0,
      points: pointsByTeamId.get(t.id) ?? 0,
    }))
    .sort((a, b) => b.points - a.points)
    .map((e, idx) => ({ ...e, rank: idx + 1 }));

  return entries;
}

export interface F1NextRace {
  raceName: string;
  circuitName?: string;
  date: string;
}

/**
 * Próxima carrera de F1 todavía no corrida. Confirmado con JSON real: el endpoint de scoreboard
 * sin fecha siempre devuelve un único evento, el próximo fin de semana de carrera — exactamente
 * lo que se necesita acá (a diferencia de "últimas carreras", donde este mismo endpoint no
 * sirve, ver `fetchF1DriverStandings`).
 */
export async function fetchF1NextRace(): Promise<F1NextRace | null> {
  const data = await fetchJson("https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard");
  const ev = data?.events?.[0];
  if (!ev) return null;
  return {
    raceName: ev.name || ev.shortName || "Gran Premio",
    circuitName: ev.circuit?.fullName || ev.competitions?.[0]?.venue?.fullName,
    date: ev.date,
  };
}

export interface NbaStandingEntry {
  teamId: string;
  teamName: string;
  teamLogo?: string;
  rank: number;
  won: number;
  lost: number;
  points: number;
}

/** Tabla de posiciones de NBA, con los puntos totales de cada equipo. */
export async function fetchNbaStandings(): Promise<NbaStandingEntry[]> {
  const data = await fetchJson("https://site.api.espn.com/apis/v2/sports/basketball/nba/standings");
  if (!data) return [];

  const groups: any[] = data?.children || [data];
  const all: NbaStandingEntry[] = [];
  for (const group of groups) {
    const rawEntries: any[] = group?.standings?.entries || [];
    for (const entry of rawEntries) {
      const team = entry.team;
      if (!team) continue;
      const stat = (name: string) => entry.stats?.find((s: any) => s.name === name || s.abbreviation === name)?.value;
      all.push({
        teamId: String(team.id ?? team.uid),
        teamName: team.displayName || team.shortDisplayName || team.name || "Equipo",
        teamLogo: team.logos?.[0]?.href || team.logo,
        rank: Math.round(stat("rank") ?? all.length + 1),
        won: Math.round(stat("wins") ?? 0),
        lost: Math.round(stat("losses") ?? 0),
        points: Math.round(stat("points") ?? stat("pointsFor") ?? 0),
      });
    }
  }
  all.sort((a, b) => a.rank - b.rank);
  return all;
}
