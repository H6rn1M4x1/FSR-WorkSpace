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

export interface F1DriverStanding {
  driverId: string;
  driverName: string;
  rank: number;
  points: number;
}

/** Campeonato de pilotos de F1. Mismo endpoint "site" que el resto de F1 en esta app. */
export async function fetchF1DriverStandings(): Promise<F1DriverStanding[]> {
  const data = await fetchJson("https://site.api.espn.com/apis/v2/sports/racing/f1/standings");
  if (!data) return [];

  const rawEntries: any[] = data?.standings?.[0]?.rankings || data?.children?.[0]?.standings?.entries || data?.standings?.entries || [];
  const entries: F1DriverStanding[] = rawEntries
    .map((entry: any, idx: number): F1DriverStanding | null => {
      const athlete = entry.athlete || entry.competitor?.athlete;
      if (!athlete) return null;
      const stat = (name: string) => entry.stats?.find((s: any) => s.name === name)?.value;
      return {
        driverId: String(athlete.id ?? idx),
        driverName: athlete.displayName || athlete.fullName || "Piloto",
        rank: Math.round(stat("rank") ?? idx + 1),
        points: Math.round(stat("points") ?? 0),
      };
    })
    .filter((e): e is F1DriverStanding => e !== null)
    .sort((a, b) => a.rank - b.rank);

  return entries;
}

export interface F1RaceResult {
  raceId: string;
  raceName: string;
  circuitName?: string;
  date: string;
  driverResults: { driverName: string; position: number; fastestLap?: boolean }[];
}

/**
 * Últimas carreras ya corridas (más reciente primero), con el resultado de cada piloto — para
 * mostrar el circuito + la posición del piloto seguido en cada una, pasando de a una.
 */
export async function fetchRecentF1Races(maxRaces: number = 6): Promise<F1RaceResult[]> {
  const data = await fetchJson("https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard");
  if (!data) return [];

  const events: any[] = data.events || [];
  const races: F1RaceResult[] = [];
  for (const ev of events) {
    const state = ev.status?.type?.state || ev.competitions?.[0]?.status?.type?.state;
    if (state !== "post") continue; // solo carreras ya corridas

    const competitors: any[] = ev.competitions?.[0]?.competitors || [];
    const driverResults = competitors
      .map((c: any) => ({
        driverName: c.athlete?.displayName || c.athlete?.fullName || "Piloto",
        position: Number(c.order ?? c.rank ?? 0),
        fastestLap: Boolean(c.records?.some?.((r: any) => r.name === "fastestLap")),
      }))
      .filter((r) => r.driverName !== "Piloto")
      .sort((a, b) => a.position - b.position);

    races.push({
      raceId: `f1race_${ev.id}`,
      raceName: ev.name || ev.shortName || "Gran Premio",
      circuitName: ev.circuit?.fullName || ev.competitions?.[0]?.venue?.fullName,
      date: ev.date,
      driverResults,
    });
  }

  races.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return races.slice(0, maxRaces);
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
