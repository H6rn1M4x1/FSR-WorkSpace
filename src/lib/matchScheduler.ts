import { TurnoCompromiso } from "../types";
import { TEAMS, Team } from "../data/teams";
import { saveCategoryToFirestore, getEffectiveUserId } from "./firestoreSyncService";

const LEAGUE_CODES: Record<string, string> = {
  "Liga Profesional": "arg.1",
  "Premier League": "eng.1",
  LaLiga: "esp.1",
  "Serie A": "ita.1",
  Bundesliga: "ger.1",
  "Ligue 1": "fra.1",
};

const FALLBACK_RIVALS: Record<string, { rival: string; rivalLogo: string; venue: string }> = {
  "Boca Juniors": {
    rival: "River Plate",
    rivalLogo: "https://paladarnegro.net/escudoteca/argentina/primeradivision/png/river.png",
    venue: "La Bombonera",
  },
  "River Plate": {
    rival: "Boca Juniors",
    rivalLogo: "https://paladarnegro.net/escudoteca/argentina/primeradivision/png/boca.png",
    venue: "Más Monumental",
  },
  "Racing Club": {
    rival: "Independiente",
    rivalLogo: "https://paladarnegro.net/escudoteca/argentina/primeradivision/png/independiente.png",
    venue: "El Cilindro de Avellaneda",
  },
  "Independiente": {
    rival: "Racing Club",
    rivalLogo: "https://paladarnegro.net/escudoteca/argentina/primeradivision/png/racing.png",
    venue: "Estadio Libertadores de América",
  },
  "San Lorenzo": {
    rival: "Huracán",
    rivalLogo: "https://paladarnegro.net/escudoteca/argentina/primeradivision/png/huracan.png",
    venue: "Estadio Pedro Bidegain",
  },
  "Real Madrid": {
    rival: "FC Barcelona",
    rivalLogo: "https://assets.footylogos.com/logos/fc-barcelona/fc-barcelona-logo-footylogos.svg",
    venue: "Santiago Bernabéu",
  },
  "FC Barcelona": {
    rival: "Real Madrid",
    rivalLogo: "https://assets.footylogos.com/logos/real-madrid/real-madrid-logo-footylogos.svg",
    venue: "Spotify Camp Nou",
  },
  Arsenal: {
    rival: "Chelsea",
    rivalLogo: "https://assets.footylogos.com/logos/chelsea/chelsea-logo-footylogos.svg",
    venue: "Emirates Stadium",
  },
};

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
    return ["arg.1", "arg.copa", "conmebol.libertadores", "conmebol.sudamericana", "fifa.friendly"];
  }
  
  const normalizedCountry = team.country?.toLowerCase() || "";
  const normalizedLeague = team.league?.toLowerCase() || "";

  if (normalizedCountry.includes("argentina") || normalizedLeague.includes("profesional")) {
    codes.push("arg.1", "arg.copa", "conmebol.libertadores", "conmebol.sudamericana");
  } else if (normalizedCountry.includes("españa") || normalizedCountry.includes("espana") || normalizedLeague.includes("laliga")) {
    codes.push("esp.1", "esp.copa_del_rey", "uefa.champions", "uefa.europa");
  } else if (normalizedCountry.includes("inglaterra") || normalizedLeague.includes("premier")) {
    codes.push("eng.1", "eng.fa", "eng.league_cup", "uefa.champions", "uefa.europa");
  } else if (normalizedCountry.includes("italia") || normalizedLeague.includes("serie a")) {
    codes.push("ita.1", "ita.coppa", "uefa.champions", "uefa.europa");
  } else if (normalizedCountry.includes("alemania") || normalizedLeague.includes("bundesliga")) {
    codes.push("ger.1", "ger.dfb_pokal", "uefa.champions", "uefa.europa");
  } else if (normalizedCountry.includes("francia") || normalizedLeague.includes("ligue 1")) {
    codes.push("fra.1", "fra.coupe_de_france", "uefa.champions", "uefa.europa");
  } else {
    codes.push("arg.1", "arg.copa", "conmebol.libertadores", "conmebol.sudamericana");
  }
  
  codes.push("fifa.friendly");
  return codes;
}

// Fetch or generate month's matches for a team
export async function generateMonthlyMatchesForTeam(
  favoriteTeamName: string,
  targetDate: Date = new Date()
): Promise<TurnoCompromiso[]> {
  const teamObj: Team | undefined = TEAMS.find((t) => t.name === favoriteTeamName);
  const teamLogo = teamObj?.logo || getLogoForTeam(favoriteTeamName);
  const leagueName = teamObj?.league || "Liga Profesional";

  const year = targetDate.getFullYear();
  const month = targetDate.getMonth(); // 0-indexed

  // Format YYYY-MM-DD
  const firstDayStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDayObj = new Date(year, month + 1, 0);
  const lastDayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDayObj.getDate()).padStart(2, "0")}`;

  const cleanQuery = favoriteTeamName
    .toLowerCase()
    .replace(/fc|club|de|cd|real|atletico|deportivo/g, "")
    .trim();

  let matchItems: TurnoCompromiso[] = [];

  // Try API first
  try {
    const fmt = (d: Date) =>
      `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
        d.getUTCDate()
      ).padStart(2, "0")}`;

    const dateRange = `${fmt(new Date(year, month, 1))}-${fmt(lastDayObj)}`;
    const leagueCodes = getLeagueCodesForTeam(teamObj);

    const apiPromises = leagueCodes.map(async (code) => {
      try {
        const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard?dates=${dateRange}`;
        const res = await fetch(url).catch(() => null);
        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          if (data) return { code, data };
        }
      } catch (e) {
        // Silently ignore inactive league codes
      }
      return null;
    });

    const apiResults = await Promise.all(apiPromises);
    const processedEventIds = new Set<string>();

    for (const resObj of apiResults) {
      if (!resObj) continue;
      const { code, data } = resObj;
      const events: any[] = data.events || [];

      const teamEvents = events.filter((e) => {
        const comps = e.competitions?.[0]?.competitors || [];
        return comps.some((c: any) => {
          const cn = c.team?.displayName?.toLowerCase() || "";
          return (
            cn.includes(cleanQuery) ||
            cleanQuery.includes(cn) ||
            c.team?.shortDisplayName?.toLowerCase()?.includes(cleanQuery)
          );
        });
      });

      for (const ev of teamEvents) {
        if (processedEventIds.has(ev.id)) continue;
        processedEventIds.add(ev.id);

        const comp = ev.competitions?.[0];
        if (!comp) continue;

        const homeComp = comp.competitors?.find((c: any) => c.homeAway === "home");
        const awayComp = comp.competitors?.find((c: any) => c.homeAway === "away");

        const homeName = homeComp?.team?.displayName || favoriteTeamName;
        const awayName = awayComp?.team?.displayName || "Rival FC";

        const homeLogo = getLogoForTeam(
          homeName,
          homeComp?.team?.logo || homeComp?.team?.logos?.[0]?.href
        );
        const awayLogo = getLogoForTeam(
          awayName,
          awayComp?.team?.logo || awayComp?.team?.logos?.[0]?.href
        );

        const eventDate = new Date(ev.date);
        const dateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}-${String(eventDate.getDate()).padStart(2, "0")}`;
        const timeStr = `${String(eventDate.getHours()).padStart(2, "0")}:${String(eventDate.getMinutes()).padStart(2, "0")}`;

        // Always resolve stadium based on home team
        const apiVenue = comp.venue?.displayName;
        const fallbackStadium = getStadiumForTeam(homeName);
        const venue = apiVenue && !apiVenue.toLowerCase().includes("default") && apiVenue.length > 3
          ? apiVenue
          : fallbackStadium;

        const id = `match-${favoriteTeamName.replace(/\s+/g, "_")}-${ev.id || dateStr}`;
        const competitionName = data.leagues?.[0]?.name || leagueName;

        let venueLat: number | null = null;
        let venueLon: number | null = null;
        try {
          const geoRes = await fetch(`/.netlify/functions/geocode-place?q=${encodeURIComponent(venue)}`);
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            venueLat = geoData.lat ?? null;
            venueLon = geoData.lon ?? null;
          }
        } catch (_) {
          // If geocoding fails, the match is still created — just without map coordinates.
        }

        matchItems.push({
          id,
          estatus: ev.status?.type?.state === "post",
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
    }
  } catch (e) {
    console.warn("API match fetch skipped, generating monthly league fixtures", e);
  }

  // Fallback: If API gave fewer than 3 matches for the entire month, generate realistic 4-5 monthly fixtures
  if (matchItems.length < 3) {
    const rivalPool: { name: string; logo: string }[] = TEAMS.filter(
      (t) => t.name !== favoriteTeamName && (t.league === leagueName || leagueName.includes(t.league))
    ).map((t) => ({ name: t.name, logo: t.logo }));

    if (rivalPool.length < 4) {
      // Add extra fallback rivals
      const fallbackRival = FALLBACK_RIVALS[favoriteTeamName] || {
        rival: "Rival FC",
        rivalLogo: "https://paladarnegro.net/escudoteca/argentina/primeradivision/png/river.png",
        venue: "Estadio Principal",
      };
      rivalPool.push({ name: fallbackRival.rival, logo: fallbackRival.rivalLogo });
      rivalPool.push({
        name: "Racing Club",
        logo: "https://paladarnegro.net/escudoteca/argentina/primeradivision/png/racing.png",
      });
      rivalPool.push({
        name: "Independiente",
        logo: "https://paladarnegro.net/escudoteca/argentina/primeradivision/png/independiente.png",
      });
      rivalPool.push({
        name: "San Lorenzo",
        logo: "https://paladarnegro.net/escudoteca/argentina/primeradivision/png/sanlorenzo.png",
      });
    }

    // Generate 4 matches across Sundays/Wednesdays of the month
    const generatedDates: number[] = [];
    const daysInMonth = lastDayObj.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dayOfWeek = d.getDay(); // 0 is Sunday, 3 is Wednesday
      if (dayOfWeek === 0 || dayOfWeek === 3) {
        generatedDates.push(day);
      }
    }

    // Pick 4 evenly spaced match dates
    const selectedDays = generatedDates.filter((_, idx) => idx % 2 === 0).slice(0, 4);
    if (selectedDays.length < 4) {
      selectedDays.push(7, 14, 21, 28);
    }

    const fallbackRivalObj = FALLBACK_RIVALS[favoriteTeamName] || {
      rival: "Rival FC",
      rivalLogo: "https://paladarnegro.net/escudoteca/argentina/primeradivision/png/river.png",
      venue: "Estadio Principal",
    };

    matchItems = [];
    for (const dayNum of selectedDays) {
      const idx = selectedDays.indexOf(dayNum);
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      const isHome = idx % 2 === 0;

      const rival = rivalPool[idx % rivalPool.length] || {
        name: fallbackRivalObj.rival,
        logo: fallbackRivalObj.rivalLogo,
      };

      const homeName = isHome ? favoriteTeamName : rival.name;
      const homeLogo = isHome ? teamLogo : rival.logo;
      const awayName = isHome ? rival.name : favoriteTeamName;
      const awayLogo = isHome ? rival.logo : teamLogo;

      // Always put the stadium of the home team as location
      const venue = getStadiumForTeam(homeName);
      const timeStr = isHome ? "18:00" : "20:30";

      let venueLat: number | null = null;
      let venueLon: number | null = null;
      try {
        const geoRes = await fetch(`/.netlify/functions/geocode-place?q=${encodeURIComponent(venue)}`);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          venueLat = geoData.lat ?? null;
          venueLon = geoData.lon ?? null;
        }
      } catch (_) {
        // If geocoding fails, the match is still created — just without map coordinates.
      }

      matchItems.push({
        id: `match-${favoriteTeamName.replace(/\s+/g, "_")}-${dateStr}`,
        estatus: false,
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
          competition: leagueName,
        }),
      });
    }
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
  const lastSyncKey = `monthly_match_sync_${team}`;

  const lastSync = localStorage.getItem(lastSyncKey);

  // Check if current turnos already have matches for this team & month
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const existingMonthMatches = currentTurnos.filter(
    (t) => t.categoria === "Ocio" && t.id.startsWith(`match-${team.replace(/\s+/g, "_")}`) && t.fecha.startsWith(currentMonthPrefix)
  );

  if (!forceRefresh && lastSync === currentMonthKey && existingMonthMatches.length >= 3) {
    return { addedCount: 0, matches: existingMonthMatches };
  }

  // Generate / Fetch matches
  const newMatches = await generateMonthlyMatchesForTeam(team, now);

  const newMatchIds = new Set(newMatches.map((m) => m.id));
  const cleaned = currentTurnos
    .filter((t) => !newMatchIds.has(t.id))
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
