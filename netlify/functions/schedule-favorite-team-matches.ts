import { schedule } from "@netlify/functions";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { argentinaDateStr } from "./_lib/argentinaTime";

// Mismo proyecto/base que el resto de las funciones programadas (ver refresh-sport-events.ts).
const firebaseConfig = {
  apiKey: "AIzaSyAdw038U48NW7DLzaXYkd09OkAYGA2zrEM",
  authDomain: "credible-bee-h5fd2.firebaseapp.com",
  projectId: "credible-bee-h5fd2",
  storageBucket: "credible-bee-h5fd2.firebasestorage.app",
  messagingSenderId: "697508839386",
  appId: "1:697508839386:web:1191400cd74be371d54ae3",
};
const FIRESTORE_DATABASE_ID = "ai-studio-fsrworkspace-54088f75-aeab-47ef-aff0-3ed53c6ba118";

// Mismo criterio que check-appointment-reminders.ts: app de un grupo chico y conocido de
// personas, no un servicio multi-tenant público, así que una lista fija alcanza.
const KNOWN_USER_EMAILS = ["hernanmaximiliano10@gmail.com", "jessicasarmiento91@gmail.com"];

// Copiado de src/data/espnTeamIds.ts (FOOTBALL_TEAM_ESPN_IDS) — netlify/functions no puede
// importar de src/ (bundle serverless separado), mismo criterio ya usado en
// refresh-sport-events.ts para FOOTBALL_COMPETITIONS.
const FOOTBALL_TEAM_ESPN_IDS: Record<string, string> = {
  "Arsenal": "359", "Aston Villa": "362", "Bournemouth": "349", "Brentford": "337",
  "Brighton & Hove Albion": "331", "Chelsea": "363", "Crystal Palace": "384", "Everton": "368",
  "Fulham": "370", "Liverpool": "364", "Manchester City": "382", "Manchester United": "360",
  "Newcastle United": "361", "Nottingham Forest": "393", "Tottenham Hotspur": "367",
  "West Ham United": "371", "Wolverhampton Wanderers": "380",
  "Athletic Club": "93", "Atlético de Madrid": "1068", "CA Osasuna": "97", "Cádiz CF": "3741",
  "Deportivo Alavés": "96", "FC Barcelona": "83", "Getafe CF": "2922", "Girona FC": "9812",
  "Rayo Vallecano": "101", "RC Celta de Vigo": "85", "RCD Mallorca": "84", "Real Betis": "244",
  "Real Madrid": "86", "Real Sociedad": "89", "Sevilla FC": "243", "UD Almería": "176",
  "UD Las Palmas": "3742", "Valencia CF": "94", "Villarreal CF": "102",
  "Atalanta": "105", "Bologna": "107", "Cagliari": "2925", "Empoli": "116", "Fiorentina": "109",
  "Frosinone": "4057", "Genoa": "3263", "Inter Milan": "110", "Juventus": "111", "Lazio": "112",
  "Lecce": "113", "AC Milan": "103", "Monza": "4007", "Napoli": "114", "Roma": "104",
  "Salernitana": "3994", "Sassuolo": "3997", "Torino": "239", "Udinese": "118", "Hellas Verona": "120",
  "Bayern Munich": "132", "Borussia Dortmund": "124", "Bayer Leverkusen": "131",
  "RB Leipzig": "11420", "VfB Stuttgart": "134", "Eintracht Frankfurt": "125", "SC Freiburg": "126",
  "Hoffenheim": "7911", "Werder Bremen": "137", "Borussia Mönchengladbach": "268",
  "Paris Saint-Germain": "160", "Monaco": "174", "Lille": "166", "Marseille": "176",
  "Lyon": "167", "Lens": "175", "Rennes": "169",
  "Boca Juniors": "5", "River Plate": "16", "Racing Club": "15", "Independiente": "11",
  "San Lorenzo": "18", "Estudiantes LP": "8", "Rosario Central": "17", "Newell's Old Boys": "14",
  "Talleres (C)": "19", "Belgrano": "4", "Argentinos Juniors": "3", "Vélez Sarsfield": "21",
  "Lanús": "12", "Defensa y Justicia": "8950", "Huracán": "10", "Gimnasia LP": "9",
  "Tigre": "7767", "Banfield": "235", "Unión": "20", "Platense": "7764", "Instituto": "2975",
  "Sarmiento": "10158", "Central Córdoba": "11989", "Atlético Tucumán": "9785",
  "Barracas Central": "10060", "Independiente Rivadavia": "9744", "Deportivo Riestra": "17702",
};

// Códigos de liga ESPN por equipo (mismo resultado que getLeagueCodesForTeam de
// src/lib/matchScheduler.ts, pero precalculado por nombre de equipo en vez de por país/liga —
// evita duplicar el catálogo completo de data/teams.ts solo para 2 campos).
const ARG_CODES = ["arg.1", "arg.copa", "conmebol.libertadores", "conmebol.sudamericana"];
const ENG_CODES = ["eng.1", "eng.fa", "eng.league_cup", "uefa.champions"];
const ESP_CODES = ["esp.1", "esp.copa_del_rey", "uefa.champions"];
const ITA_CODES = ["ita.1", "ita.coppa", "uefa.champions"];
const GER_CODES = ["ger.1", "ger.dfb_pokal", "uefa.champions"];
const FRA_CODES = ["fra.1", "fra.coupe_de_france", "uefa.champions"];
const ENG_TEAMS = ["Arsenal", "Aston Villa", "Bournemouth", "Brentford", "Brighton & Hove Albion", "Chelsea", "Crystal Palace", "Everton", "Fulham", "Liverpool", "Manchester City", "Manchester United", "Newcastle United", "Nottingham Forest", "Tottenham Hotspur", "West Ham United", "Wolverhampton Wanderers"];
const ESP_TEAMS = ["Athletic Club", "Atlético de Madrid", "CA Osasuna", "Cádiz CF", "Deportivo Alavés", "FC Barcelona", "Getafe CF", "Girona FC", "Rayo Vallecano", "RC Celta de Vigo", "RCD Mallorca", "Real Betis", "Real Madrid", "Real Sociedad", "Sevilla FC", "UD Almería", "UD Las Palmas", "Valencia CF", "Villarreal CF"];
const ITA_TEAMS = ["Atalanta", "Bologna", "Cagliari", "Empoli", "Fiorentina", "Frosinone", "Genoa", "Inter Milan", "Juventus", "Lazio", "Lecce", "AC Milan", "Monza", "Napoli", "Roma", "Salernitana", "Sassuolo", "Torino", "Udinese", "Hellas Verona"];
const GER_TEAMS = ["Bayern Munich", "Borussia Dortmund", "Bayer Leverkusen", "RB Leipzig", "VfB Stuttgart", "Eintracht Frankfurt", "SC Freiburg", "Hoffenheim", "Werder Bremen", "Borussia Mönchengladbach"];
const FRA_TEAMS = ["Paris Saint-Germain", "Monaco", "Lille", "Marseille", "Lyon", "Lens", "Rennes"];

function getLeagueCodesForTeamName(teamName: string): string[] {
  if (ENG_TEAMS.includes(teamName)) return ENG_CODES;
  if (ESP_TEAMS.includes(teamName)) return ESP_CODES;
  if (ITA_TEAMS.includes(teamName)) return ITA_CODES;
  if (GER_TEAMS.includes(teamName)) return GER_CODES;
  if (FRA_TEAMS.includes(teamName)) return FRA_CODES;
  return ARG_CODES; // Argentina + cualquier equipo no catalogado, mismo fallback que el cliente.
}

// Copiado de TEAM_STADIUMS en src/lib/matchScheduler.ts (solo lo necesario como respaldo si ESPN
// no trae el nombre del estadio).
const TEAM_STADIUMS: Record<string, string> = {
  "Boca Juniors": "La Bombonera", "River Plate": "Más Monumental", "Racing Club": "El Cilindro de Avellaneda",
  "Independiente": "Estadio Libertadores de América", "San Lorenzo": "Estadio Pedro Bidegain (Nuevo Gasómetro)",
  "Estudiantes LP": "Estadio UNO Jorge Luis Hirschi", "Rosario Central": "Estadio Gigante de Arroyito",
  "Newell's Old Boys": "Estadio Coloso Del Parque Marcelo Bielsa", "Talleres (C)": "Estadio Mario Alberto Kempes",
  "Belgrano": "Estadio Julio César Villagra", "Argentinos Juniors": "Estadio Diego Armando Maradona",
  "Vélez Sarsfield": "Estadio José Amalfitani", "Lanús": "Estadio Ciudad de Lanús",
  "Defensa y Justicia": "Estadio Norberto \"Tito\" Tomaghello", "Huracán": "Estadio Tomás Adolfo Ducó",
  "Gimnasia LP": "Estadio Juan Carmelo Zerillo", "Tigre": "Estadio José Dellagiovanna",
  "Banfield": "Estadio Florencio Sola", "Unión": "Estadio 15 de Abril", "Platense": "Estadio Ciudad de Vicente López",
  "Instituto": "Estadio Juan Domingo Perón", "Sarmiento": "Estadio Eva Perón",
  "Central Córdoba": "Estadio Único Madre de Ciudades", "Atlético Tucumán": "Estadio Monumental José Fierro",
  "Barracas Central": "Estadio Claudio \"Chiqui\" Tapia", "Independiente Rivadavia": "Estadio Bautista Gargantini",
  "Deportivo Riestra": "Estadio Guillermo Laza",
};
function getStadiumForTeam(teamName: string): string {
  if (!teamName) return "Estadio Principal";
  const normalized = teamName.toLowerCase();
  for (const [key, stadium] of Object.entries(TEAM_STADIUMS)) {
    if (normalized.includes(key.toLowerCase()) || key.toLowerCase().includes(normalized)) return stadium;
  }
  return `Estadio de ${teamName}`;
}

// Geocodifica un lugar con OpenStreetMap/Nominatim directo (sin pasar por la función
// geocode-place: acá ya estamos del lado del servidor, round-trip innecesario). Mismo motor que
// usa el resto de la app (Nominatim, no Google Maps).
async function geocodeVenue(venue: string): Promise<{ lat: number | null; lon: number | null }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(venue)}&format=json&limit=1`,
      { headers: { "User-Agent": "FSR-Workspace/1.0" } }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      }
    }
  } catch (_) {
    // sin coordenadas, el turno igual se crea — solo queda sin punto en el mapa
  }
  return { lat: null, lon: null };
}

async function fetchTeamScheduleAllCompetitions(teamName: string, espnId: string): Promise<any[]> {
  const codes = getLeagueCodesForTeamName(teamName);
  const results = await Promise.all(
    codes.map(async (code) => {
      try {
        const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/teams/${espnId}/schedule`);
        if (!res.ok) return [] as any[];
        const data = await res.json().catch(() => null);
        return (data?.events || []) as any[];
      } catch (_) {
        return [] as any[];
      }
    })
  );
  const seen = new Set<string>();
  const merged: any[] = [];
  for (const events of results) {
    for (const ev of events) {
      if (seen.has(ev.id)) continue;
      seen.add(ev.id);
      merged.push(ev);
    }
  }
  return merged;
}

/** Equivalente server-side de generateMonthlyMatchesForTeam (src/lib/matchScheduler.ts), sin el
 * merge con el caché compartido de eventos (esa parte solo rellena huecos de corto plazo; el
 * fixture completo del endpoint por equipo ya cubre bien el mes entero para este propósito). */
async function generateMonthlyMatches(teamName: string, now: Date): Promise<any[]> {
  const espnId = FOOTBALL_TEAM_ESPN_IDS[teamName];
  if (!espnId) return [];

  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const events = await fetchTeamScheduleAllCompetitions(teamName, espnId);
  const matchItems: any[] = [];

  for (const ev of events) {
    const eventDate = new Date(ev.date);
    if (isNaN(eventDate.getTime()) || eventDate < monthStart || eventDate > monthEnd) continue;

    const comp = ev.competitions?.[0];
    const competitors = comp?.competitors || [];
    const homeComp = competitors.find((c: any) => c.homeAway === "home");
    const awayComp = competitors.find((c: any) => c.homeAway === "away");
    if (!comp || !homeComp || !awayComp) continue;

    const homeName = homeComp.team?.displayName || teamName;
    const awayName = awayComp.team?.displayName || "Rival";
    const homeLogo = homeComp.team?.logos?.[0]?.href || homeComp.team?.logo || "";
    const awayLogo = awayComp.team?.logos?.[0]?.href || awayComp.team?.logo || "";

    const dateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}-${String(eventDate.getDate()).padStart(2, "0")}`;
    const timeStr = `${String(eventDate.getHours()).padStart(2, "0")}:${String(eventDate.getMinutes()).padStart(2, "0")}`;

    const apiVenue = comp.venue?.fullName || comp.venue?.displayName;
    const venue = apiVenue && apiVenue.length > 3 ? apiVenue : getStadiumForTeam(homeName);
    const competitionName = ev.league?.name || "Liga Profesional";

    const { lat: venueLat, lon: venueLon } = await geocodeVenue(venue);

    matchItems.push({
      id: `match-${teamName.replace(/\s+/g, "_")}-${ev.id || dateStr}`,
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
      updatedAt: Date.now(),
    });
  }

  return matchItems;
}

/**
 * Reemplaza automáticamente el botón "Agendar Partidos del Mes en Agenda" de
 * FavoriteTeamWidget.tsx — corre todos los días pero solo hace el trabajo real una vez por mes
 * por usuario (gateado por profile.lastAutoMatchSyncMonth, mismo patrón que
 * whatsappLastSummaryDate en check-appointment-reminders.ts), así que un día puntual que falle no
 * deja al usuario sin sus partidos agendados hasta el mes siguiente — el día siguiente reintenta.
 */
const handlerFn = async () => {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getFirestore(app, FIRESTORE_DATABASE_ID);
  const now = new Date();
  // Pivote en el calendario de Argentina, no en el del runtime (UTC) — mismo motivo que
  // argentinaTodayMidnightUtc en refresh-sport-events.ts: cerca de la medianoche, el mes según
  // UTC puede ser distinto del mes real en Argentina.
  const argDateParts = argentinaDateStr(now).split("-").map(Number);
  const argNow = new Date(argDateParts[0], argDateParts[1] - 1, argDateParts[2], 12, 0, 0);
  const currentMonthKey = `${argDateParts[0]}-${String(argDateParts[1]).padStart(2, "0")}`;

  for (const email of KNOWN_USER_EMAILS) {
    try {
      const profileSnap = await getDocs(collection(db, "users", email, "user_profile"));
      const profileDocSnap = profileSnap.docs[0];
      const profile = profileDocSnap?.data();
      if (!profile) continue;
      if (profile.lastAutoMatchSyncMonth === currentMonthKey) continue; // ya se hizo este mes

      const team = profile.favoriteTeam || "Boca Juniors";
      const newMatches = await generateMonthlyMatches(team, argNow);

      const turnosSnap = await getDocs(collection(db, "users", email, "turnos_compromisos"));
      const teamPrefix = `match-${String(team).replace(/\s+/g, "_")}`;
      const currentMonthPrefix = currentMonthKey;
      const existingAutoMatchIds = turnosSnap.docs
        .filter((d) => {
          const data = d.data() as any;
          return data.categoria === "Ocio" && String(d.id).startsWith(teamPrefix) && String(data.fecha || "").startsWith(currentMonthPrefix);
        })
        .map((d) => d.id);

      const newIds = new Set(newMatches.map((m) => m.id));
      const toDelete = existingAutoMatchIds.filter((id) => !newIds.has(id));

      await Promise.all([
        ...newMatches.map((m) => setDoc(doc(db, "users", email, "turnos_compromisos", m.id), m, { merge: true })),
        ...toDelete.map((id) => deleteDoc(doc(db, "users", email, "turnos_compromisos", id))),
      ]);

      if (profileDocSnap) {
        await updateDoc(doc(db, "users", email, "user_profile", profileDocSnap.id), {
          lastAutoMatchSyncMonth: currentMonthKey,
        });
      }

      console.log(`[schedule-favorite-team-matches] ${email}: ${newMatches.length} partido(s) de ${team} agendados para ${currentMonthKey}.`);
    } catch (err) {
      console.error(`[schedule-favorite-team-matches] Error for ${email}:`, err);
    }
  }

  return { statusCode: 200, body: "OK" };
};

// Corre una vez por día — el gateo mensual de arriba hace que el trabajo real ocurra una sola vez
// al mes por usuario, pero reintenta automáticamente al otro día si ese primer intento del mes
// falla (vencimiento de red, ESPN caído, etc.) en vez de esperar al mes siguiente.
export const handler = schedule("0 10 * * *", handlerFn);
