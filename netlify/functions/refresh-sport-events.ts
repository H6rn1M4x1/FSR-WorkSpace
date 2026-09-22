import { schedule } from "@netlify/functions";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc, collectionGroup, getDocs } from "firebase/firestore";

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

// Catálogo completo de competencias con código ESPN confirmado válido (ver matchScheduler.ts /
// footballCompetitions.ts) — "uefa.europa" y "fifa.friendly" dieron 400 confirmado en vivo, así
// que quedan afuera. Este catálogo SIEMPRE se pide entero (piso mínimo garantizado); lo dinámico
// por preferencias de usuarios (ver `computeFollowedCompetitionCodes` más abajo) solo puede sumar
// competencias por fuera de acá, nunca sacar nada de esta lista. Nombres en criollo (no el código
// ESPN) para que "Partidos de Hoy" muestre "Premier League" en vez de "eng.1" — deben coincidir
// con src/data/footballCompetitions.ts.
const FOOTBALL_COMPETITIONS: { id: string; name: string }[] = [
  { id: "arg.1", name: "Liga Profesional Argentina" },
  { id: "arg.copa", name: "Copa Argentina" },
  { id: "conmebol.libertadores", name: "Copa Libertadores" },
  { id: "conmebol.sudamericana", name: "Copa Sudamericana" },
  { id: "eng.1", name: "Premier League" },
  { id: "esp.1", name: "LaLiga" },
  { id: "ita.1", name: "Serie A" },
  { id: "ger.1", name: "Bundesliga" },
  { id: "fra.1", name: "Ligue 1" },
  { id: "uefa.champions", name: "UEFA Champions League" },
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

function mapEvent(ev: any, sportId: "futbol" | "nba", competitionId: string, competitionName: string): CachedSportEvent | null {
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
    // Antes usaba "ev.league?.name" como nombre — confirmado en vivo que ESPN devuelve ahí el
    // código crudo de la liga (ej. "eng.1") para fútbol en vez de un nombre de verdad, así que
    // se usa directamente el nombre curado que ya conocemos (footballCompetitions.ts / "NBA").
    competitionName,
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

interface StoredEventPreferences {
  followedCompetitions?: string[];
}

/**
 * Unión de las competencias enteras que los usuarios siguen explícitamente (`followedCompetitions`,
 * ya son códigos ESPN — ver footballCompetitions.ts), leída una vez por refresh vía
 * `collectionGroup` (barre `users/*\/event_preferences/*` de una — reglas de Firestore de este
 * proyecto son abiertas, así que no hace falta nada especial para leer entre usuarios). Se usa
 * solo para SUMAR por fuera del catálogo curado (ver más abajo) — nunca para restarle nada, así
 * nunca se pierde cobertura que antes funcionaba. Si algo falla (ej. la lectura de Firestore), se
 * degrada a un set vacío sin cortar el refresh — el catálogo curado ya cubre todo lo seguible
 * hoy, así que esto es puramente a futuro (nuevas ligas que se agreguen como seguibles).
 */
async function computeFollowedCompetitionCodes(db: ReturnType<typeof getFirestore>): Promise<Set<string>> {
  const codes = new Set<string>();
  try {
    const snap = await getDocs(collectionGroup(db, "event_preferences"));
    snap.forEach((docSnap) => {
      const data = docSnap.data() as StoredEventPreferences;
      (data.followedCompetitions || []).forEach((code) => codes.add(code));
    });
  } catch (error) {
    console.error("[refresh-sport-events] Error leyendo preferencias de usuarios:", error);
  }
  return codes;
}

/**
 * Refresca un caché compartido (para toda la app, no por usuario) de partidos de ayer + hoy +
 * los próximos 7 días del catálogo curado de competencias + NBA + lo que los usuarios sigan por
 * fuera de ese catálogo, en `shared_data/sport_events_cache`. Antes "Eventos deportivos" hacía
 * que cada navegador le pegara directo a ESPN por cada equipo seguido — esto lo centraliza en un
 * solo pedido periódico del lado del servidor, que todos los usuarios leen igual que "Qué hacer
 * en San Juan", y cada usuario lo filtra por sus propias preferencias al leerlo. El filtro de
 * días de la UI necesita datos de esos 9 días para no mostrar "sin partidos" en pestañas que sí
 * tienen fixtures.
 */
const handlerFn = async () => {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getFirestore(app, FIRESTORE_DATABASE_ID);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const DAYS_AHEAD = 7;
  const days: Date[] = [];
  for (let offset = -1; offset <= DAYS_AHEAD; offset++) {
    days.push(new Date(today.getTime() + offset * 24 * 60 * 60 * 1000));
  }

  const items: CachedSportEvent[] = [];
  const seen = new Set<string>();
  let okRequests = 0;
  let failedRequests = 0;

  try {
    const followedCodes = await computeFollowedCompetitionCodes(db);
    // El catálogo curado (FOOTBALL_COMPETITIONS) es siempre el piso mínimo — nunca se saca nada
    // de acá para no perder cobertura que ya funcionaba. Lo dinámico (preferencias reales de
    // usuarios) solo puede SUMAR competencias por fuera de ese catálogo si en el futuro se
    // agregan más ligas seguibles; hoy en día followedCodes ya es subconjunto del catálogo, así
    // que esto es efectivamente un no-op salvo que se amplíe FOLLOWABLE_COMPETITIONS. NBA
    // siempre se pide, como siempre — es una sola competencia, no vale la pena condicionarla.
    const extraCodes = Array.from(followedCodes).filter((code) => !FOOTBALL_COMPETITIONS.some((c) => c.id === code));
    const competitionsToFetch = [...FOOTBALL_COMPETITIONS, ...extraCodes.map((id) => ({ id, name: id }))];
    console.log(`[refresh-sport-events] pidiendo ${competitionsToFetch.length} competencia(s) de fútbol + NBA`);

    // Un solo Promise.all con todas las competencias × 9 días + NBA a la vez le pegaba a ESPN de
    // una sola ráfaga — confirmado en vivo que el caché terminaba con datos solo de ayer/hoy/
    // mañana (los primeros días en resolver) y nada de los días siguientes, como si ESPN
    // empezara a rechazar o cortar pedidos bajo esa ráfaga. Se recorre día por día en vez de
    // todo junto: un pedido en paralelo por competencia (+ NBA) por día, uno detrás del otro.
    for (const day of days) {
      const dayPromises = [
        ...competitionsToFetch.map(async (comp) => {
          try {
            const data = await fetchScoreboardForDay("soccer", comp.id, day);
            if (data === null) {
              failedRequests++;
              return;
            }
            okRequests++;
            const events: any[] = data?.events || [];
            for (const ev of events) {
              const mapped = mapEvent(ev, "futbol", comp.id, comp.name);
              if (mapped && !seen.has(mapped.id)) {
                seen.add(mapped.id);
                items.push(mapped);
              }
            }
          } catch (_) {
            // una competencia/día que falla no debe tirar abajo el resto del refresh
            failedRequests++;
          }
        }),
        (async () => {
          try {
            const data = await fetchScoreboardForDay("basketball", "nba", day);
            if (data === null) {
              failedRequests++;
              return;
            }
            okRequests++;
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
            failedRequests++;
          }
        })(),
      ];
      await Promise.all(dayPromises);
    }

    console.log(
      `[refresh-sport-events] ${items.length} event(s), ${okRequests} pedido(s) ok, ${failedRequests} pedido(s) fallido(s)`
    );

    // Si TODOS (o casi todos) los pedidos a ESPN fallaron, "items" va a dar vacío o casi vacío
    // sin que eso signifique que de verdad no hay partidos — es mucho más probable que ESPN esté
    // rechazando pedidos en este momento (ya confirmado que pasa bajo ráfagas/temporalmente en
    // este proyecto). Escribir ese resultado vacío pisaría un caché anterior que sí tenía datos
    // reales, dejando la app en blanco hasta el próximo refresh exitoso. Si no hubo NINGÚN pedido
    // exitoso, se deja el caché anterior intacto en vez de escribir vacío encima.
    if (okRequests === 0 && failedRequests > 0) {
      console.warn(`[refresh-sport-events] los ${failedRequests} pedidos a ESPN fallaron todos — no se toca el caché anterior`);
      return { statusCode: 200, body: `skip: ${failedRequests} failed requests, 0 ok` };
    }

    await setDoc(doc(db, "shared_data", "sport_events_cache"), {
      items,
      fetchedAt: Date.now(),
    });

    return { statusCode: 200, body: `OK (${items.length} eventos, ${failedRequests} pedidos fallidos)` };
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
