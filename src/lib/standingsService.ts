/**
 * Tablas de posiciones para la fila de "Posiciones" al final de Eventos: ligas de fútbol
 * seguidas, campeonato de F1 y NBA. Mismo patrón defensivo que el resto de esta app respecto a
 * ESPN — cada fetch va en try/catch y nunca fabrica datos: si algo falla, se devuelve un arreglo
 * vacío y el panel correspondiente lo muestra como "no disponible" en vez de romperse o inventar
 * filas.
 *
 * Endpoints de standings confirmados en vivo con JSON real de ESPN (antes no se había podido,
 * por una restricción de red del entorno de desarrollo ya levantada). Dos hallazgos reales:
 * 1) Una liga de fútbol puede devolver más de un grupo en `children` (zonas/conferencias, no
 *    solo "liga dividida en grupos" de ejemplo — ahora mismo la Liga Profesional Argentina está
 *    repartida en "Group A"/"Group B" de 15 equipos cada una por el formato de Clausura). Tomar
 *    solo `children[0]` perdía en silencio la mitad de esos equipos.
 * 2) El campeonato de constructores de F1 SÍ viene armado y correcto en el propio endpoint de
 *    standings (un segundo grupo en `children` con `entries[].team` en vez de `entries[].athlete`,
 *    y su propio stat "points" ya sumado) — no hace falta reconstruirlo sumando puntos de
 *    pilotos por escudería.
 */

import { F1_TEAMS, F1_TEAM_LOGOS } from "../data/f1";

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

/**
 * Diagnóstico visible en pantalla (no solo en la consola del navegador, que no todos los
 * usuarios saben abrir) de por qué una tabla de posiciones da puntos en 0 — queda acá, en
 * memoria del módulo, para que los paneles (StandingsPanels.tsx) lo lean después de cada fetch
 * y lo muestren directo en la tarjeta "No disponible" en vez de pedir que alguien revise la
 * consola. Se borra sin usar si en algún momento se confirma el nombre correcto del campo.
 */
export const standingsDebug: {
  football: Record<string, string | undefined>; // por leagueCode
  f1Drivers?: string;
  f1Constructors?: string;
} = { football: {} };

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
 * scoreboard/schedule) — confirmado en vivo, ver nota arriba del archivo.
 */
export async function fetchFootballStandings(leagueCode: string, leagueName: string): Promise<FootballLeagueStandings | null> {
  const data = await fetchJson(`https://site.api.espn.com/apis/v2/sports/soccer/${leagueCode}/standings`);
  if (!data) return null;

  // La forma exacta del JSON de standings de ESPN varía entre "standings.entries" directo y
  // "children[].standings.entries" — y, en este último caso, puede haber MÁS DE UN grupo
  // (zonas/conferencias: p.ej. la Liga Profesional Argentina se reparte en "Group A"/"Group B"
  // durante el Clausura) — se combinan todos los grupos, no solo el primero, para no perder
  // equipos en silencio.
  const rawGroups: any[][] = data?.standings?.entries
    ? [data.standings.entries]
    : data?.children?.length
      ? data.children.map((c: any) => c?.standings?.entries || []).filter((arr: any[]) => arr.length)
      : data?.groups?.[0]?.standings?.entries
        ? [data.groups[0].standings.entries]
        : [];

  const rawEntries: any[] = rawGroups.flat();
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

  // Si la liga vino repartida en más de un grupo, el "rank" de ESPN es relativo a cada grupo
  // por separado (dos equipos distintos con rank 1, etc.) — se recalcula un único ranking por
  // puntos totales para que la tabla combinada tenga sentido.
  if (rawGroups.length > 1) {
    entries.sort((a, b) => b.points - a.points);
    entries.forEach((e, idx) => {
      e.rank = idx + 1;
    });
  }

  // Diagnóstico temporal: si TODOS los puntos dieron 0 pese a haber equipos reales, lo más
  // probable es que el stat se llame distinto a "points" en este endpoint puntual (nunca
  // confirmado en vivo, ver nota al principio del archivo) — loguea el array de stats crudo de
  // la primera entrada para poder identificar el nombre correcto sin tener que adivinar de
  // nuevo a ciegas.
  if (entries.every((e) => e.points === 0) && rawEntries[0]) {
    const raw = JSON.stringify(rawEntries[0]?.stats ?? []);
    console.warn(`[standingsService] Fútbol (${leagueName}): todos los puntos dieron 0 — stats crudos de la primera entrada:`, rawEntries[0]?.stats);
    standingsDebug.football[leagueCode] = raw;
  } else {
    delete standingsDebug.football[leagueCode];
  }

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

  // Diagnóstico temporal — ver el mismo comentario en fetchFootballStandings.
  if (entries.length && entries.every((e) => e.points === 0) && rawEntries[0]) {
    console.warn("[standingsService] F1 pilotos: todos los puntos dieron 0 — stats crudos de la primera entrada:", rawEntries[0]?.stats);
    standingsDebug.f1Drivers = JSON.stringify(rawEntries[0]?.stats ?? []);
  } else {
    delete standingsDebug.f1Drivers;
  }

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
 * Campeonato de constructores de F1. Confirmado en vivo con JSON real de ESPN: el endpoint de
 * standings trae un segundo grupo en `children` con las escuderías ya armadas y sus puntos
 * reales (entries con "team" en vez de "athlete", stat "points" — no "championshipPts" como en
 * pilotos — ya sumado y correcto). Se usa ese grupo directo, en vez de reconstruirlo sumando
 * puntos de pilotos por escudería contra el roster de data/f1.ts (enfoque anterior, que fallaba
 * en 0 apenas un nombre de piloto de ESPN no coincidía exactamente con ese roster).
 */
export async function fetchF1ConstructorStandings(): Promise<F1ConstructorStanding[]> {
  const data = await fetchJson("https://site.api.espn.com/apis/v2/sports/racing/f1/standings");
  if (!data) return [];

  const children: any[] = data?.children || [];
  // El grupo de escuderías se identifica por tener "team" en sus entries (el de pilotos tiene
  // "athlete") en vez de depender de que siempre sea children[1].
  const constructorGroup = children.find((c: any) => c?.standings?.entries?.[0]?.team);
  const rawEntries: any[] = constructorGroup?.standings?.entries || [];

  const entries: F1ConstructorStanding[] = rawEntries
    .map((entry: any, idx: number): F1ConstructorStanding | null => {
      const team = entry.team;
      if (!team) return null;
      const stat = (name: string) => entry.stats?.find((s: any) => s.name === name)?.value;
      // Logo propio solo si el nombre de ESPN matchea contra data/f1.ts (mismo criterio laxo
      // ya usado para pilotos) — si no matchea, se muestra sin logo en vez de romper.
      const known = F1_TEAMS.find((t) => {
        const a = t.name.toLowerCase();
        const b = (team.displayName || team.name || "").toLowerCase();
        return a === b || a.includes(b) || b.includes(a);
      });
      return {
        teamId: String(team.id ?? idx),
        teamName: team.displayName || team.name || "Escudería",
        teamLogo: known ? F1_TEAM_LOGOS[known.id] : undefined,
        rank: Math.round(stat("rank") ?? idx + 1),
        points: Math.round(stat("points") ?? 0),
      };
    })
    .filter((e): e is F1ConstructorStanding => e !== null)
    .sort((a, b) => a.rank - b.rank);

  // Diagnóstico temporal: si ESPN no trae un grupo de escuderías reconocible esta vez (cambio
  // de formato del endpoint), queda visible en vez de fallar en silencio.
  if (!entries.length) {
    standingsDebug.f1Constructors = constructorGroup
      ? "El grupo de escuderías no trajo entries."
      : `No se encontró un grupo de escuderías entre los children del endpoint (nombres: ${children.map((c) => c?.name).join(", ")}).`;
  } else {
    delete standingsDebug.f1Constructors;
  }

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
