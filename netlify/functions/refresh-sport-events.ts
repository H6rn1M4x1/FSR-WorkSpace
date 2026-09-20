import { schedule } from "@netlify/functions";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// Same Firebase project/config as the rest of the serverless functions (see
// refresh-san-juan-events.ts) — kept in sync manually since there's no shared env var for it
// in this repo.
const firebaseConfig = {
  apiKey: "AIzaSyAdw038U48NW7DLzaXYkd09OkAYGA2zrEM",
  authDomain: "credible-bee-h5fd2.firebaseapp.com",
  projectId: "credible-bee-h5fd2",
  storageBucket: "credible-bee-h5fd2.firebasestorage.app",
  messagingSenderId: "697508839386",
  appId: "1:697508839386:web:1191400cd74be371d54ae3",
};
const FIRESTORE_DATABASE_ID = "ai-studio-fsrworkspace-54088f75-aeab-47ef-aff0-3ed53c6ba118";

// Solo códigos de liga confirmados válidos (ver matchScheduler.ts / footballCompetitions.ts) —
// "uefa.europa" y "fifa.friendly" dieron 400 confirmado en vivo, así que quedan afuera.
const FOOTBALL_COMPETITIONS = [
  "arg.1",
  "arg.copa",
  "conmebol.libertadores",
  "conmebol.sudamericana",
  "eng.1",
  "esp.1",
  "ita.1",
  "ger.1",
  "fra.1",
  "uefa.champions",
];

interface CachedSportEvent {
  id: string;
  sportId: "futbol" | "nba";
  competitionId: string;
  competitionName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: "live" | "upcoming" | "finished";
  statusText: string;
  homeTeam: string;
  homeTeamId?: string; // id de ESPN — para matchear equipos seguidos con precisión
  homeLogo?: string;
  homeScore?: string;
  awayTeam: string;
  awayTeamId?: string;
  awayLogo?: string;
  awayScore?: string;
  venue?: string;
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Confirmado en vivo (ver PR "Sacar el rango de fechas..."): el scoreboard de ESPN con
 * "dates" como RANGO devuelve 400 sin importar la liga. Una fecha puntual ("dates=YYYYMMDD",
 * sin rango) es el uso estándar/documentado de esa misma API y no tiene ese problema — se pide
 * una vez por día (ayer/hoy/mañana) en vez de un rango de 3 días.
 */
async function fetchScoreboardForDay(sportPath: string, competitionCode: string, day: Date): Promise<any> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/${competitionCode}/scoreboard?dates=${fmtDate(day)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

function mapEvent(ev: any, sportId: "futbol" | "nba", competitionId: string, competitionNameFallback: string): CachedSportEvent | null {
  const comp = ev.competitions?.[0];
  const competitors = comp?.competitors || [];
  const homeComp = competitors.find((c: any) => c.homeAway === "home");
  const awayComp = competitors.find((c: any) => c.homeAway === "away");
  if (!comp || !homeComp || !awayComp) return null;

  const eventDate = new Date(ev.date);
  if (isNaN(eventDate.getTime())) return null;

  const state = comp.status?.type?.state || ev.status?.type?.state;
  const prefix = sportId === "futbol" ? "fb" : "nba";

  return {
    id: `${prefix}_${ev.id}`,
    sportId,
    competitionId,
    competitionName: ev.league?.name || competitionNameFallback,
    date: isoDate(eventDate),
    time: `${String(eventDate.getHours()).padStart(2, "0")}:${String(eventDate.getMinutes()).padStart(2, "0")}`,
    status: state === "in" ? "live" : state === "post" ? "finished" : "upcoming",
    statusText: comp.status?.type?.shortDetail || comp.status?.type?.description || "",
    homeTeam: homeComp.team?.displayName || "Local",
    homeTeamId: homeComp.team?.id ? String(homeComp.team.id) : undefined,
    homeLogo: homeComp.team?.logos?.[0]?.href || homeComp.team?.logo,
    homeScore: homeComp.score?.displayValue ?? homeComp.score,
    awayTeam: awayComp.team?.displayName || "Visitante",
    awayTeamId: awayComp.team?.id ? String(awayComp.team.id) : undefined,
    awayLogo: awayComp.team?.logos?.[0]?.href || awayComp.team?.logo,
    awayScore: awayComp.score?.displayValue ?? awayComp.score,
    venue: comp.venue?.fullName || comp.venue?.displayName,
  };
}

/**
 * Refresca un caché compartido (para toda la app, no por usuario) de partidos de ayer/hoy/
 * mañana de las competencias más seguidas + NBA, en `shared_data/sport_events_cache`. Antes
 * "Eventos deportivos" hacía que cada navegador le pegara directo a ESPN por cada equipo
 * seguido — esto lo centraliza en un solo pedido periódico del lado del servidor, que todos
 * los usuarios leen igual que "Qué hacer en San Juan".
 */
const handlerFn = async () => {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getFirestore(app, FIRESTORE_DATABASE_ID);

  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const days = [yesterday, today, tomorrow];

  const items: CachedSportEvent[] = [];
  const seen = new Set<string>();

  try {
    const footballPromises = FOOTBALL_COMPETITIONS.flatMap((code) =>
      days.map(async (day) => {
        try {
          const data = await fetchScoreboardForDay("soccer", code, day);
          const events: any[] = data?.events || [];
          for (const ev of events) {
            const mapped = mapEvent(ev, "futbol", code, code);
            if (mapped && !seen.has(mapped.id)) {
              seen.add(mapped.id);
              items.push(mapped);
            }
          }
        } catch (_) {
          // una competencia/día que falla no debe tirar abajo el resto del refresh
        }
      })
    );

    const nbaPromises = days.map(async (day) => {
      try {
        const data = await fetchScoreboardForDay("basketball", "nba", day);
        const events: any[] = data?.events || [];
        for (const ev of events) {
          const mapped = mapEvent(ev, "nba", "nba", "NBA");
          if (mapped && !seen.has(mapped.id)) {
            seen.add(mapped.id);
            items.push(mapped);
          }
        }
      } catch (_) {
        // idem
      }
    });

    await Promise.all([...footballPromises, ...nbaPromises]);

    console.log(`[refresh-sport-events] cached ${items.length} event(s)`);
    await setDoc(doc(db, "shared_data", "sport_events_cache"), {
      items,
      fetchedAt: Date.now(),
    });

    return { statusCode: 200, body: `OK (${items.length} eventos)` };
  } catch (error: any) {
    console.error("Error in refresh-sport-events:", error);
    // Dejar el caché anterior intacto — un refresh fallido nunca debería vaciar uno que
    // funcionaba, mismo criterio que refresh-san-juan-events.
    return { statusCode: 200, body: `error: ${error?.message || "unknown"}` };
  }
};

// Cada 15 minutos — los partidos en vivo cambian de un minuto a otro, así que esto necesita
// mucha más frecuencia que el refresh diario de San Juan.
export const handler = schedule("*/15 * * * *", handlerFn);
