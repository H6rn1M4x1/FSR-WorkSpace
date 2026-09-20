import { TurnoCompromiso } from "../types";
import { TEAMS, Team } from "../data/teams";
import { saveCategoryToFirestore, getEffectiveUserId } from "./firestoreSyncService";
import { FOOTBALL_TEAM_ESPN_IDS } from "../data/espnTeamIds";

export const TEAM_STADIUMS: Record<string, string> = {
  // Argentina
  "Boca Juniors": "La Bombonera",
  "River Plate": "Más Monumental",
  "Racing Club": "El Cilindro de Avellaneda",
  "Independiente": "Estadio Libertadores de América",
  "San Lorenzo": "Estadio Pedro Bidegain (Nuevo Gasómetro)",
  "Estudiantes LP": "Estadio UNO Jorge Luis Hirschi",
  "Rosario Central": "Estadio Gigante de Arroyito",
  "Newell's Old Boys": "Estadio Coloso Del Parque Marcelo Bielsa",
  "Talleres (C)": "Estadio Mario Alberto Kempes",
  "Belgrano": "Estadio Julio César Villagra",
  "Argentinos Juniors": "Estadio Diego Armando Maradona",
  "Vélez Sarsfield": "Estadio José Amalfitani",
  "Lanús": "Estadio Ciudad de Lanús",
  "Defensa y Justicia": "Estadio Norberto \"Tito\" Tomaghello",
  "Huracán": "Estadio Tomás Adolfo Ducó",
  "Gimnasia LP": "Estadio Juan Carmelo Zerillo",
  "Tigre": "Estadio José Dellagiovanna",
  "Banfield": "Estadio Florencio Sola",
  "Unión": "Estadio 15 de Abril",
  "Platense": "Estadio Ciudad de Vicente López",
  "Instituto": "Estadio Juan Domingo Perón",
  "Sarmiento": "Estadio Eva Perón",
  "Central Córdoba": "Estadio Único Madre de Ciudades",
  "Atlético Tucumán": "Estadio Monumental José Fierro",
  "Barracas Central": "Estadio Claudio \"Chiqui\" Tapia",
  "Independiente Rivadavia": "Estadio Bautista Gargantini",
  "Deportivo Riestra": "Estadio Guillermo Laza",

  // España
  "Real Madrid": "Estadio Santiago Bernabéu",
  "FC Barcelona": "Estadio Spotify Camp Nou",
  "Atlético de Madrid": "Estadio Cívitas Metropolitano",
  "Athletic Club": "Estadio San Mamés",
  "CA Osasuna": "Estadio El Sadar",
  "Girona FC": "Estadio Montilivi",
  "Real Betis": "Estadio Benito Villamarín",
  "Real Sociedad": "Estadio Anoeta",
  "Sevilla FC": "Estadio Ramón Sánchez-Pizjuán",
  "Valencia CF": "Estadio de Mestalla",
  "Villarreal CF": "Estadio de la Cerámica",

  // Inglaterra
  "Manchester City": "Etihad Stadium",
  "Manchester United": "Old Trafford",
  "Arsenal": "Emirates Stadium",
  "Chelsea": "Stamford Bridge",
  "Liverpool": "Anfield",
  "Tottenham Hotspur": "Tottenham Hotspur Stadium",
  "Aston Villa": "Villa Park",

  // Alemania
  "Bayern Munich": "Allianz Arena",
  "Borussia Dortmund": "Signal Iduna Park",
  "Bayer Leverkusen": "BayArena",

  // Italia
  "Juventus": "Allianz Stadium",
  "Inter Milan": "Estadio Giuseppe Meazza",
  "AC Milan": "Estadio San Siro",
  "Roma": "Estadio Olímpico de Roma",
  "Lazio": "Estadio Olímpico de Roma",
  "Napoli": "Estadio Diego Armando Maradona (Nápoles)",

  // Francia
  "Paris Saint-Germain": "Parc des Princes",
  "Monaco": "Stade Louis II",
  "Marseille": "Stade Vélodrome"
};

export function getStadiumForTeam(teamName: string): string {
  if (!teamName) return "Estadio Principal";
  const normalized = teamName.toLowerCase();
  
  for (const [key, stadium] of Object.entries(TEAM_STADIUMS)) {
    if (normalized.includes(key.toLowerCase()) || key.toLowerCase().includes(normalized)) {
      return stadium;
    }
  }
  
  return `Estadio de ${teamName}`;
}

// Find logo for a given team name
export function getLogoForTeam(name: string, fallbackLogo?: string): string {
  if (fallbackLogo && fallbackLogo.length > 5) return fallbackLogo;
  const match = TEAMS.find(
    (t) =>
      t.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(t.name.toLowerCase())
  );
  return match?.logo || fallbackLogo || "";
}

// Extract team logos from TurnoCompromiso
export function getMatchTeamLogos(tc: TurnoCompromiso): {
  homeTeam?: string;
  homeLogo?: string;
  awayTeam?: string;
  awayLogo?: string;
  competition?: string;
} | null {
  if (tc.categoria !== "Ocio") return null;

  // 1. Try parsing JSON in informacionPersonalizada
  if (tc.informacionPersonalizada) {
    try {
      const parsed = JSON.parse(tc.informacionPersonalizada);
      if (parsed && (parsed.homeLogo || parsed.awayLogo)) {
        return {
          homeTeam: parsed.homeTeam,
          homeLogo: parsed.homeLogo,
          awayTeam: parsed.awayTeam,
          awayLogo: parsed.awayLogo,
          competition: parsed.competition,
        };
      }
    } catch (e) {
      // Not JSON, continue
    }
  }

  // 2. Try parsing archivosNecesarios
  if (tc.archivosNecesarios && tc.archivosNecesarios.length >= 2) {
    const homeFile = tc.archivosNecesarios.find((f) => f.name === "homeLogo");
    const awayFile = tc.archivosNecesarios.find((f) => f.name === "awayLogo");
    if (homeFile && awayFile) {
      const parts = tc.descripcion.split(/ vs | VS /i);
      return {
        homeTeam: parts[0]?.trim(),
        homeLogo: homeFile.url,
        awayTeam: parts[1]?.trim(),
        awayLogo: awayFile.url,
      };
    }
  }

  // 3. Fallback: Parse description e.g. "Boca Juniors vs River Plate" or "Partido: Boca Juniors vs River Plate"
  const cleanDesc = tc.descripcion.replace(/^(Partido:|⚽)\s*/i, "").trim();
  const parts = cleanDesc.split(/\s+(?:vs|VS)\s+/);
  if (parts.length === 2) {
    const homeName = parts[0].trim();
    const awayName = parts[1].trim();
    const homeLogo = getLogoForTeam(homeName);
    const awayLogo = getLogoForTeam(awayName);
    return {
      homeTeam: homeName,
      homeLogo,
      awayTeam: awayName,
      awayLogo,
    };
  }

  return null;
}

export function getLeagueCodesForTeam(team: Team | undefined): string[] {
  const codes: string[] = [];
  if (!team) {
    // If no team, default to Argentina popular leagues
    return ["arg.1", "arg.copa", "conmebol.libertadores", "conmebol.sudamericana"];
  }

  const normalizedCountry = team.country?.toLowerCase() || "";
  const normalizedLeague = team.league?.toLowerCase() || "";

  // "uefa.europa" y "fifa.friendly" salieron confirmados con 400 (código de liga no
  // reconocido por la API oculta de ESPN — no es que no haya partidos, la request se
  // rechaza) al revisar la consola en vivo del usuario. "fifa.friendly" además se agregaba
  // a TODOS los equipos sin excepción y nunca se había confirmado como válido, así que se
  // saca del todo en vez de dejarlo como un código "gratis" que siempre falla.
  if (normalizedCountry.includes("argentina") || normalizedLeague.includes("profesional")) {
    codes.push("arg.1", "arg.copa", "conmebol.libertadores", "conmebol.sudamericana");
  } else if (normalizedCountry.includes("españa") || normalizedCountry.includes("espana") || normalizedLeague.includes("laliga")) {
    codes.push("esp.1", "esp.copa_del_rey", "uefa.champions");
  } else if (normalizedCountry.includes("inglaterra") || normalizedLeague.includes("premier")) {
    codes.push("eng.1", "eng.fa", "eng.league_cup", "uefa.champions");
  } else if (normalizedCountry.includes("italia") || normalizedLeague.includes("serie a")) {
    codes.push("ita.1", "ita.coppa", "uefa.champions");
  } else if (normalizedCountry.includes("alemania") || normalizedLeague.includes("bundesliga")) {
    codes.push("ger.1", "ger.dfb_pokal", "uefa.champions");
  } else if (normalizedCountry.includes("francia") || normalizedLeague.includes("ligue 1")) {
    codes.push("fra.1", "fra.coupe_de_france", "uefa.champions");
  } else {
    codes.push("arg.1", "arg.copa", "conmebol.libertadores", "conmebol.sudamericana");
  }

  return codes;
}

// Fetch this month's real matches for a team from ESPN's per-team schedule endpoint.
export async function generateMonthlyMatchesForTeam(
  favoriteTeamName: string,
  targetDate: Date = new Date()
): Promise<TurnoCompromiso[]> {
  const teamObj: Team | undefined = TEAMS.find((t) => t.name === favoriteTeamName);
  const leagueName = teamObj?.league || "Liga Profesional";

  const year = targetDate.getFullYear();
  const month = targetDate.getMonth(); // 0-indexed
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const matchItems: TurnoCompromiso[] = [];

  // Antes, si la API no devolvía al menos 3 partidos para el mes (algo que pasaba siempre,
  // porque el scoreboard con "dates" como rango le da 400 a la API de ESPN sin importar la
  // liga), el código directamente INVENTABA 4 partidos contra un rival de relleno en fechas
  // generadas al azar y los guardaba como turnos reales — así aparecía, por ejemplo, "Boca vs
  // River" en una fecha que no tenía nada que ver con el fixture real. Se saca esa invención
  // por completo: si no hay partidos reales este mes, la lista vuelve vacía.
  const espnId = FOOTBALL_TEAM_ESPN_IDS[favoriteTeamName];
  if (!espnId) return matchItems;

  const leagueCode = getLeagueCodesForTeam(teamObj)[0] || "arg.1";
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueCode}/teams/${espnId}/schedule`);
    if (!res.ok) return matchItems;
    const data = await res.json();
    const events: any[] = data.events || [];

    for (const ev of events) {
      const eventDate = new Date(ev.date);
      if (isNaN(eventDate.getTime()) || eventDate < monthStart || eventDate > monthEnd) continue;

      const comp = ev.competitions?.[0];
      const competitors = comp?.competitors || [];
      const homeComp = competitors.find((c: any) => c.homeAway === "home");
      const awayComp = competitors.find((c: any) => c.homeAway === "away");
      if (!comp || !homeComp || !awayComp) continue;

      const homeName = homeComp.team?.displayName || favoriteTeamName;
      const awayName = awayComp.team?.displayName || "Rival";

      const homeLogo = getLogoForTeam(homeName, homeComp.team?.logos?.[0]?.href || homeComp.team?.logo);
      const awayLogo = getLogoForTeam(awayName, awayComp.team?.logos?.[0]?.href || awayComp.team?.logo);

      const dateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}-${String(eventDate.getDate()).padStart(2, "0")}`;
      const timeStr = `${String(eventDate.getHours()).padStart(2, "0")}:${String(eventDate.getMinutes()).padStart(2, "0")}`;

      const apiVenue = comp.venue?.fullName || comp.venue?.displayName;
      const venue = apiVenue && apiVenue.length > 3 ? apiVenue : getStadiumForTeam(homeName);
      const competitionName = ev.league?.name || leagueName;

      let venueLat: number | null = null;
      let venueLon: number | null = null;
      try {
        const geoRes = await fetch(`/.netlify/functions/geocode-place?q=${encodeURIComponent(venue)}`);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (Array.isArray(geoData) && geoData.length > 0) {
            venueLat = parseFloat(geoData[0].lat);
            venueLon = parseFloat(geoData[0].lon);
          }
        }
      } catch (_) {
        // If geocoding fails, the match is still created — just without map coordinates.
      }

      matchItems.push({
        id: `match-${favoriteTeamName.replace(/\s+/g, "_")}-${ev.id || dateStr}`,
        estatus: comp.status?.type?.state === "post",
        descripcion: `${homeName} vs ${awayName}`,
        categoria: "Ocio",
        fecha: `${dateStr}T${timeStr}`,
        lugar: venue,
        lat: venueLat,
        lon: venueLon,
        informacionPersonalizada: JSON.stringify({
          homeTeam: homeName,
          homeLogo,
          awayTeam: awayName,
          awayLogo,
          competition: competitionName,
        }),
      });
    }
  } catch (e) {
    console.warn("[matchScheduler] Error fetching monthly matches from ESPN:", e);
  }

  return matchItems;
}

// Main auto-sync helper called on load/monthly/team change
export async function syncMonthlyMatches(
  favoriteTeamName: string,
  currentTurnos: TurnoCompromiso[],
  setTurnos: (updated: TurnoCompromiso[] | ((prev: TurnoCompromiso[]) => TurnoCompromiso[])) => void,
  forceRefresh: boolean = false
): Promise<{ addedCount: number; matches: TurnoCompromiso[] }> {
  const team = favoriteTeamName || "Boca Juniors";
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}_${team}`;
  // "v2": la versión anterior de este sync a veces inventaba partidos falsos cuando la API
  // fallaba y los guardaba marcando el mes como ya sincronizado — cambiar de key fuerza una
  // resincronización real (y el reemplazo completo de abajo) la primera vez que corre este
  // fix, en vez de confiar en la marca vieja y dejar los datos inventados como están.
  const lastSyncKey = `monthly_match_sync_v2_${team}`;

  const lastSync = localStorage.getItem(lastSyncKey);

  // Check if current turnos already have matches for this team & month
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isAutoMatchForThisTeamAndMonth = (t: TurnoCompromiso) =>
    t.categoria === "Ocio" && t.id.startsWith(`match-${team.replace(/\s+/g, "_")}`) && t.fecha.startsWith(currentMonthPrefix);
  const existingMonthMatches = currentTurnos.filter(isAutoMatchForThisTeamAndMonth);

  if (!forceRefresh && lastSync === currentMonthKey && existingMonthMatches.length >= 3) {
    return { addedCount: 0, matches: existingMonthMatches };
  }

  // Generate / Fetch matches
  const newMatches = await generateMonthlyMatchesForTeam(team, now);

  // Reemplazo completo: se sacan TODOS los partidos auto-agendados anteriores para este
  // equipo y mes (no solo los que comparten id con la tanda nueva) antes de agregar los
  // reales — así no quedan mezclados partidos inventados de una corrida vieja con los reales.
  const cleaned = currentTurnos
    .filter((t) => !isAutoMatchForThisTeamAndMonth(t))
    .map((t) => (t.descripcion.includes("⚽") ? { ...t, descripcion: t.descripcion.replace(/⚽\s*/g, "").trim() } : t));
  const updatedTurnos = [...cleaned, ...newMatches];

  // Save the entire updated collection of turnos to Firestore
  try {
    const userId = getEffectiveUserId();
    await saveCategoryToFirestore(userId, "turnos_compromisos", updatedTurnos, currentTurnos);
  } catch (err) {
    console.warn("Failed to persist matches to Firestore:", err);
  }

  setTurnos(updatedTurnos);

  localStorage.setItem(lastSyncKey, currentMonthKey);
  return { addedCount: newMatches.length, matches: newMatches };
}
