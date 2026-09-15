import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  saveItemToFirestore,
  refetchCategory,
  subscribeToCategory,
} from "./firestoreSyncService";
import type { EventPreferences, SanJuanEvent, SportEvent } from "../types";
import { SPORTS_CATALOG } from "./sportsCatalog";
import { TEAMS, Team } from "../data/teams";
import { getLeagueCodesForTeam } from "./matchScheduler";
import { FOOTBALL_LEAGUES } from "../data/footballLeagues";
import { F1_TEAMS, F1_DRIVERS, F1_TEAM_LOGOS } from "../data/f1";
import { fetchWikiThumbnail } from "./wikipedia";
import { f1TeamLogoUrl, f1DriverPhotoUrl } from "./cloudinary";

const PREFS_CATEGORY = "event_preferences";

/** Per-user: which sports/teams to show in the events calendar. */
export async function fetchEventPreferences(userId: string): Promise<EventPreferences | null> {
  const items = await refetchCategory(userId, PREFS_CATEGORY);
  const doc = items.find((i) => i.id === userId);
  return (doc as EventPreferences) || null;
}

export function subscribeEventPreferences(
  userId: string,
  onUpdate: (prefs: EventPreferences | null) => void
) {
  return subscribeToCategory(userId, PREFS_CATEGORY, (items) => {
    const doc = items.find((i) => i.id === userId) || null;
    onUpdate(doc as EventPreferences | null);
  });
}

export async function saveEventPreferences(userId: string, prefs: EventPreferences): Promise<void> {
  await saveItemToFirestore(userId, PREFS_CATEGORY, { ...prefs, id: userId });
}

// --- San Juan local agenda: one shared cache document, refreshed by whoever opens the
// tab first after a month has passed, read by everyone. ---

const SAN_JUAN_DOC = doc(db, "shared_data", "san_juan_events");

interface ScrapedCacheDoc {
  items: SanJuanEvent[];
  monthKey: string; // "YYYY-MM" of the last successful refresh
  fetchedAt: number;
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function getSanJuanEvents(): Promise<SanJuanEvent[]> {
  const snap = await getDoc(SAN_JUAN_DOC);
  const cached = snap.exists() ? (snap.data() as ScrapedCacheDoc) : null;
  if (cached && cached.monthKey === currentMonthKey() && cached.items?.length > 0) {
    return cached.items;
  }

  try {
    const res = await fetch("/.netlify/functions/events-san-juan");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items: SanJuanEvent[] = (data.items || []).map((it: any) => ({
      id: it.id || `sj_${Math.random().toString(36).slice(2, 10)}`,
      title: it.title,
      date: it.rawDate || "",
      rawDate: it.rawDate || undefined,
      location: it.location || undefined,
      imageUrl: it.imageUrl || undefined,
      sourceUrl: it.sourceUrl || undefined,
    }));
    if (items.length > 0) {
      await setDoc(SAN_JUAN_DOC, { items, monthKey: currentMonthKey(), fetchedAt: Date.now() });
      return items;
    }
  } catch (err) {
    console.warn("[eventsService] No se pudo actualizar la agenda de San Juan:", err);
  }

  return cached?.items || [];
}

// --- Fútbol: leagues first, then clubs within a league (data/teams.ts + data/footballLeagues.ts) ---

export { FOOTBALL_LEAGUES };

export function getFootballClubs(leagueId: string): Team[] {
  return TEAMS.filter((t) => t.league === leagueId);
}

/** Fixtures for one followed fútbol club, from ESPN's public (no-key, CORS-open) scoreboard API. */
async function fetchFootballFixturesForTeam(team: Team): Promise<SportEvent[]> {
  const codes = getLeagueCodesForTeam(team);
  const now = new Date();
  const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const dateRange = `${fmt(now)}-${fmt(horizon)}`;
  const cleanQuery = team.name.toLowerCase().replace(/fc|club|de|cd|real|atletico|deportivo/g, "").trim();

  const results: SportEvent[] = [];
  for (const code of codes) {
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard?dates=${dateRange}`);
      if (!res.ok) continue;
      const data = await res.json();
      const events: any[] = data.events || [];
      for (const ev of events) {
        const comp = ev.competitions?.[0];
        const comps = comp?.competitors || [];
        const involved = comps.some((c: any) => {
          const cn = (c.team?.displayName || "").toLowerCase();
          return cn.includes(cleanQuery) || cleanQuery.includes(cn);
        });
        if (!comp || !involved) continue;

        const home = comps.find((c: any) => c.homeAway === "home");
        const away = comps.find((c: any) => c.homeAway === "away");
        const eventDate = new Date(ev.date);
        const dateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}-${String(eventDate.getDate()).padStart(2, "0")}`;
        const timeStr = `${String(eventDate.getHours()).padStart(2, "0")}:${String(eventDate.getMinutes()).padStart(2, "0")}`;

        results.push({
          id: `fb_${ev.id}`,
          sportId: "futbol",
          leagueName: data.leagues?.[0]?.name || team.league,
          title: `${home?.team?.displayName || "?"} vs ${away?.team?.displayName || "?"}`,
          date: dateStr,
          time: timeStr,
          homeTeamBadge: home?.team?.logo,
          awayTeamBadge: away?.team?.logo,
          venue: comp.venue?.displayName,
        });
      }
    } catch (err) {
      console.warn(`[eventsService] Error fetching ESPN fixtures for league ${code}:`, err);
    }
  }
  return results;
}

// --- F1: curated grid (data/f1.ts). Team logos are a fixed, known-good Cloudinary URL per
// team (given directly, no guessing needed). Driver photos come from a Netlify scrape of
// formula1.com/en/drivers, matched by name, with Wikipedia as a last-resort fallback. ---

export { F1_TEAMS, F1_DRIVERS, fetchWikiThumbnail };

interface F1ScrapedAssets {
  images: { alt: string; src: string }[];
}

let f1AssetsPromise: Promise<F1ScrapedAssets> | null = null;
function fetchF1Assets(): Promise<F1ScrapedAssets> {
  if (!f1AssetsPromise) {
    f1AssetsPromise = fetch("/.netlify/functions/f1-images")
      .then((r) => (r.ok ? r.json() : { images: [] }))
      .then((d) => ({ images: d.images || [] }))
      .catch(() => ({ images: [] }));
  }
  return f1AssetsPromise;
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Finds the best-matching image for a name among the scraped page images, matching by last
 *  word (surname) for people, or full name for anything else. */
function findImageForName(name: string, images: { alt: string; src: string }[]): string | null {
  const target = normalizeForMatch(name);
  const targetWords = target.split(" ");
  const lastWord = targetWords[targetWords.length - 1];
  const exact = images.find((img) => normalizeForMatch(img.alt) === target);
  if (exact) return exact.src;
  const bySurname = images.find((img) => {
    const alt = normalizeForMatch(img.alt);
    return alt.length > 2 && (alt.includes(lastWord) || target.includes(alt));
  });
  return bySurname ? bySurname.src : null;
}

/** Team crest — a fixed, known-good URL per team (see data/f1.ts), upsized via Cloudinary. */
export function fetchF1TeamLogo(teamId: string): string | null {
  const raw = F1_TEAM_LOGOS[teamId];
  return raw ? f1TeamLogoUrl(raw) : null;
}

/** Driver photo — the official transparent cutout from formula1.com/en/drivers, cropped
 *  torso-up via Cloudinary. Wikipedia as a last-resort fallback. */
export async function fetchF1DriverPhoto(driverName: string): Promise<string | null> {
  const { images } = await fetchF1Assets();
  const fromSource = findImageForName(driverName, images);
  if (fromSource) return f1DriverPhotoUrl(fromSource);
  return fetchWikiThumbnail(driverName);
}

export async function fetchF1Races(): Promise<SportEvent[]> {
  try {
    const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard");
    if (!res.ok) return [];
    const data = await res.json();
    const events: any[] = data.events || [];
    return events.map((ev) => {
      const d = new Date(ev.date);
      return {
        id: `f1_${ev.id}`,
        sportId: "f1",
        leagueName: "Fórmula 1",
        title: ev.name || ev.shortName || "Gran Premio",
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
        venue: ev.circuit?.fullName || ev.competitions?.[0]?.venue?.fullName || undefined,
      } as SportEvent;
    });
  } catch (err) {
    console.warn("[eventsService] Error fetching F1 calendar from ESPN:", err);
    return [];
  }
}

// --- NBA: static roster (badges from cdn.nba.com — renders instantly, no network dependency
// for the picker itself) + fixtures via ESPN, matched by name, regular + preseason. ---

export { NBA_TEAMS } from "../data/nba";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

async function fetchEspnScoreboardEvents(dateRange: string, seasontype?: number): Promise<any[]> {
  try {
    const q = seasontype ? `dates=${dateRange}&seasontype=${seasontype}` : `dates=${dateRange}`;
    const res = await fetch(`${ESPN_BASE}/basketball/nba/scoreboard?${q}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch (err) {
    console.warn("[eventsService] Error fetching NBA scoreboard from ESPN:", err);
    return [];
  }
}

async function fetchNbaFollowedEvents(followedTeamNames: string[]): Promise<SportEvent[]> {
  if (followedTeamNames.length === 0) return [];
  const now = new Date();
  const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const dateRange = `${fmt(now)}-${fmt(horizon)}`;
  const cleanNames = followedTeamNames.map((n) => n.toLowerCase());

  // Regular season + preseason (seasontype=1), merged — the default scoreboard call can miss
  // preseason games depending on the time of year, so it's fetched explicitly too.
  const [regular, preseason] = await Promise.all([
    fetchEspnScoreboardEvents(dateRange),
    fetchEspnScoreboardEvents(dateRange, 1),
  ]);
  const seenIds = new Set<string>();
  const results: SportEvent[] = [];
  for (const ev of [...preseason, ...regular]) {
    if (seenIds.has(ev.id)) continue;
    seenIds.add(ev.id);
    const comp = ev.competitions?.[0];
    const comps = comp?.competitors || [];
    const involved = comps.some((c: any) => {
      const cn = (c.team?.displayName || "").toLowerCase();
      return cleanNames.some((n) => cn.includes(n) || n.includes(cn));
    });
    if (!comp || !involved) continue;
    const home = comps.find((c: any) => c.homeAway === "home");
    const away = comps.find((c: any) => c.homeAway === "away");
    const d = new Date(ev.date);
    const isPreseason = ev.seasonType?.id === "1" || ev.season?.slug === "preseason";
    results.push({
      id: `nba_${ev.id}`,
      sportId: "nba",
      leagueName: isPreseason ? "NBA (Pretemporada)" : "NBA",
      title: `${home?.team?.displayName || "?"} vs ${away?.team?.displayName || "?"}`,
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
      homeTeamBadge: home?.team?.logo,
      awayTeamBadge: away?.team?.logo,
      venue: comp.venue?.fullName,
    });
  }
  return results;
}

/** Upcoming events for every sport/team/driver the user follows, deduplicated. */
export async function fetchFollowedSportEvents(prefs: EventPreferences | null): Promise<SportEvent[]> {
  if (!prefs || prefs.followedSports.length === 0) return [];
  const results: SportEvent[] = [];

  for (const sportId of prefs.followedSports) {
    const teams = prefs.followedTeams[sportId] || [];
    if (sportId === "futbol") {
      // Un try/catch por CLUB, no uno solo envolviendo a todos los clubes seguidos: antes, si
      // un club fallaba (o TEAMS.find no lo encontraba y algo más adelante explotaba), se
      // perdían los partidos de todos los clubes seguidos después de ese, en vez de solo los
      // de ese club — lo que coincide con "si marco varios equipos, no trae nada".
      for (const followed of teams) {
        try {
          const team = TEAMS.find((t) => t.id === followed.id);
          if (team) results.push(...(await fetchFootballFixturesForTeam(team)));
        } catch (err) {
          console.warn(`[eventsService] Error fetching fixtures for club ${followed.id}:`, err);
        }
      }
    } else if (sportId === "f1") {
      try {
        results.push(...(await fetchF1Races()));
      } catch (err) {
        console.warn("[eventsService] Error fetching F1 races:", err);
      }
    } else if (sportId === "nba") {
      try {
        results.push(...(await fetchNbaFollowedEvents(teams.map((t) => t.name))));
      } catch (err) {
        console.warn("[eventsService] Error fetching NBA events:", err);
      }
    }
  }

  const seen = new Set<string>();
  return results.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
}

export { SPORTS_CATALOG };
