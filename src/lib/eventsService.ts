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
import { F1_TEAMS, F1_DRIVERS } from "../data/f1";
import { MOTOGP_TEAMS, MOTOGP_RIDERS } from "../data/motogp";
import { fetchWikiThumbnail } from "./wikipedia";

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

async function getMonthlyScrapedEvents(
  docRef: ReturnType<typeof doc>,
  functionPath: string,
  label: string
): Promise<SanJuanEvent[]> {
  const snap = await getDoc(docRef);
  const cached = snap.exists() ? (snap.data() as ScrapedCacheDoc) : null;
  if (cached && cached.monthKey === currentMonthKey() && cached.items?.length > 0) {
    return cached.items;
  }

  try {
    const res = await fetch(functionPath);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items: SanJuanEvent[] = (data.items || []).map((it: any) => ({
      id: it.id || `${label}_${Math.random().toString(36).slice(2, 10)}`,
      title: it.title,
      date: it.rawDate || "",
      rawDate: it.rawDate || undefined,
      imageUrl: it.imageUrl || undefined,
      sourceUrl: it.sourceUrl || undefined,
    }));
    if (items.length > 0) {
      await setDoc(docRef, { items, monthKey: currentMonthKey(), fetchedAt: Date.now() });
      return items;
    }
  } catch (err) {
    console.warn(`[eventsService] No se pudo actualizar ${label}:`, err);
  }

  // Fall back to whatever was cached (even from a previous month) rather than showing nothing.
  return cached?.items || [];
}

export function getSanJuanEvents(): Promise<SanJuanEvent[]> {
  return getMonthlyScrapedEvents(SAN_JUAN_DOC, "/.netlify/functions/events-san-juan", "San Juan");
}

const MOTOGP_CALENDAR_DOC = doc(db, "shared_data", "motogp_calendar");
export function getMotoGpCalendar(): Promise<SanJuanEvent[]> {
  return getMonthlyScrapedEvents(MOTOGP_CALENDAR_DOC, "/.netlify/functions/motogp-calendar", "el calendario de MotoGP");
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

// --- F1 / MotoGP: curated grid (data/f1.ts, data/motogp.ts), photos/logos via Wikipedia. ---

export { F1_TEAMS, F1_DRIVERS, MOTOGP_TEAMS, MOTOGP_RIDERS, fetchWikiThumbnail };

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

// --- Tenis: ESPN's ATP/WTA scoreboards, no follow-team concept — just the tour calendar. ---

export async function fetchTennisEvents(): Promise<SportEvent[]> {
  const results: SportEvent[] = [];
  for (const tour of ["atp", "wta"]) {
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/tennis/${tour}/scoreboard`);
      if (!res.ok) continue;
      const data = await res.json();
      const events: any[] = data.events || [];
      events.forEach((ev) => {
        const d = new Date(ev.date);
        results.push({
          id: `tenis_${tour}_${ev.id}`,
          sportId: "tenis",
          leagueName: tour.toUpperCase(),
          title: ev.name || ev.shortName || "Torneo",
          date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
          venue: ev.competitions?.[0]?.venue?.fullName || undefined,
        });
      });
    } catch (err) {
      console.warn(`[eventsService] Error fetching ${tour} calendar from ESPN:`, err);
    }
  }
  return results;
}

// --- NBA / NFL: teams + fixtures straight from ESPN's site API (badges included). ---

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

async function fetchEspnTeams(sportPath: string, leaguePath: string): Promise<{ id: string; name: string; badgeUrl?: string }[]> {
  try {
    const res = await fetch(`${ESPN_BASE}/${sportPath}/${leaguePath}/teams?limit=100`);
    if (!res.ok) return [];
    const data = await res.json();
    const list = data?.sports?.[0]?.leagues?.[0]?.teams || [];
    return list.map((entry: any) => ({
      id: String(entry.team.id),
      name: entry.team.displayName,
      badgeUrl: entry.team.logos?.[0]?.href || undefined,
    }));
  } catch (err) {
    console.warn(`[eventsService] Error fetching ${leaguePath} teams from ESPN:`, err);
    return [];
  }
}

async function fetchEspnFollowedEvents(
  sportPath: string,
  leaguePath: string,
  sportId: string,
  leagueLabel: string,
  followedTeamIds: string[]
): Promise<SportEvent[]> {
  if (followedTeamIds.length === 0) return [];
  const now = new Date();
  const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const dateRange = `${fmt(now)}-${fmt(horizon)}`;

  try {
    const res = await fetch(`${ESPN_BASE}/${sportPath}/${leaguePath}/scoreboard?dates=${dateRange}`);
    if (!res.ok) return [];
    const data = await res.json();
    const events: any[] = data.events || [];
    const results: SportEvent[] = [];
    for (const ev of events) {
      const comp = ev.competitions?.[0];
      const comps = comp?.competitors || [];
      const involved = comps.some((c: any) => followedTeamIds.includes(String(c.id)));
      if (!comp || !involved) continue;
      const home = comps.find((c: any) => c.homeAway === "home");
      const away = comps.find((c: any) => c.homeAway === "away");
      const d = new Date(ev.date);
      results.push({
        id: `${sportId}_${ev.id}`,
        sportId,
        leagueName: leagueLabel,
        title: `${home?.team?.displayName || "?"} vs ${away?.team?.displayName || "?"}`,
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
        homeTeamBadge: home?.team?.logo,
        awayTeamBadge: away?.team?.logo,
        venue: comp.venue?.fullName,
      });
    }
    return results;
  } catch (err) {
    console.warn(`[eventsService] Error fetching ${leaguePath} scoreboard from ESPN:`, err);
    return [];
  }
}

export const fetchNbaTeams = () => fetchEspnTeams("basketball", "nba");
export const fetchNflTeams = () => fetchEspnTeams("football", "nfl");

/** Upcoming events for every sport/team/driver the user follows, deduplicated. */
export async function fetchFollowedSportEvents(prefs: EventPreferences | null): Promise<SportEvent[]> {
  if (!prefs || prefs.followedSports.length === 0) return [];
  const results: SportEvent[] = [];

  for (const sportId of prefs.followedSports) {
    const teams = prefs.followedTeams[sportId] || [];
    try {
      if (sportId === "futbol") {
        for (const followed of teams) {
          const team = TEAMS.find((t) => t.id === followed.id);
          if (team) results.push(...(await fetchFootballFixturesForTeam(team)));
        }
      } else if (sportId === "f1") {
        results.push(...(await fetchF1Races()));
      } else if (sportId === "motogp") {
        const races = await getMotoGpCalendar();
        races.forEach((r) =>
          results.push({
            id: `motogp_${r.id}`,
            sportId: "motogp",
            leagueName: "MotoGP",
            title: r.title,
            date: r.date || r.rawDate || "",
          })
        );
      } else if (sportId === "tenis") {
        results.push(...(await fetchTennisEvents()));
      } else if (sportId === "nba") {
        results.push(...(await fetchEspnFollowedEvents("basketball", "nba", "nba", "NBA", teams.map((t) => t.id))));
      } else if (sportId === "nfl") {
        results.push(...(await fetchEspnFollowedEvents("football", "nfl", "nfl", "NFL", teams.map((t) => t.id))));
      }
    } catch (err) {
      console.warn(`[eventsService] Error fetching events for sport ${sportId}:`, err);
    }
  }

  const seen = new Set<string>();
  return results.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
}

export { SPORTS_CATALOG };
