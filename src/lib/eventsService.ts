import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  saveItemToFirestore,
  refetchCategory,
  subscribeToCategory,
} from "./firestoreSyncService";
import type { EventPreferences, SanJuanEvent, SportEvent } from "../types";
import { SPORTS_CATALOG, getSportById } from "./sportsCatalog";
import { TEAMS, Team } from "../data/teams";
import { getLeagueCodesForTeam } from "./matchScheduler";

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

interface SanJuanCacheDoc {
  items: SanJuanEvent[];
  monthKey: string; // "YYYY-MM" of the last successful refresh
  fetchedAt: number;
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Reads the shared cache, and refreshes it from the server (scrape) if it's stale (a new month). */
export async function getSanJuanEvents(): Promise<SanJuanEvent[]> {
  const snap = await getDoc(SAN_JUAN_DOC);
  const cached = snap.exists() ? (snap.data() as SanJuanCacheDoc) : null;
  if (cached && cached.monthKey === currentMonthKey() && cached.items?.length > 0) {
    return cached.items;
  }

  try {
    const res = await fetch("/.netlify/functions/events-san-juan");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items: SanJuanEvent[] = (data.items || []).map((it: any) => ({
      id: it.id,
      title: it.title,
      date: it.rawDate || "",
      rawDate: it.rawDate || undefined,
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

  // Fall back to whatever was cached (even from a previous month) rather than showing nothing.
  return cached?.items || [];
}

// --- Sports calendars: resolved on demand via the server's TheSportsDB proxy. ---

const leagueIdMemo: Record<string, string> = {};

async function resolveLeagueId(sportId: string): Promise<string | null> {
  const sport = getSportById(sportId);
  if (!sport) return null;
  if (leagueIdMemo[sportId]) return leagueIdMemo[sportId];
  const params = new URLSearchParams({ q: sport.leagueQuery, sport: sport.sportsDbSport });
  if (sport.country) params.set("country", sport.country);
  const res = await fetch(`/.netlify/functions/sportsdb-search-league?${params.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.leagueId) leagueIdMemo[sportId] = data.leagueId;
  return data.leagueId || null;
}

export async function fetchTeamsForSport(sportId: string): Promise<{ id: string; name: string; badgeUrl?: string }[]> {
  // Fútbol reuses the curated club roster (real names + official badge URLs) that
  // FavoriteTeamWidget/matchScheduler already use elsewhere in the app — no network call, and
  // no risk of resolving the wrong league (which is what happened going through TheSportsDB).
  if (sportId === "futbol") {
    return TEAMS.map((t) => ({ id: t.id, name: `${t.name} · ${t.league}`, badgeUrl: t.logo }));
  }
  const leagueId = await resolveLeagueId(sportId);
  if (!leagueId) return [];
  const res = await fetch(`/.netlify/functions/sportsdb-teams?leagueId=${encodeURIComponent(leagueId)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.teams || [];
}

/**
 * Fixtures for one followed fútbol club, from ESPN's public (no-key, CORS-open) scoreboard
 * API — the same source matchScheduler.ts already uses for the favorite-team widget on
 * Inicio. Far more reliable for football specifically than TheSportsDB's league search.
 */
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

/** Upcoming events for every sport/team the user follows, deduplicated. */
export async function fetchFollowedSportEvents(prefs: EventPreferences | null): Promise<SportEvent[]> {
  if (!prefs || prefs.followedSports.length === 0) return [];
  const results: SportEvent[] = [];

  for (const sportId of prefs.followedSports) {
    const teams = prefs.followedTeams[sportId] || [];
    try {
      if (sportId === "futbol") {
        for (const followed of teams) {
          const team = TEAMS.find((t) => t.id === followed.id);
          if (!team) continue;
          results.push(...(await fetchFootballFixturesForTeam(team)));
        }
        continue;
      }

      if (teams.length > 0) {
        for (const team of teams) {
          const res = await fetch(`/.netlify/functions/sportsdb-next-events?teamId=${encodeURIComponent(team.id)}`);
          if (!res.ok) continue;
          const data = await res.json();
          (data.events || []).forEach((e: any) => results.push({ ...e, sportId }));
        }
      } else {
        const leagueId = await resolveLeagueId(sportId);
        if (!leagueId) continue;
        const res = await fetch(`/.netlify/functions/sportsdb-next-events?leagueId=${encodeURIComponent(leagueId)}`);
        if (!res.ok) continue;
        const data = await res.json();
        (data.events || []).forEach((e: any) => results.push({ ...e, sportId }));
      }
    } catch (err) {
      console.warn(`[eventsService] Error fetching events for sport ${sportId}:`, err);
    }
  }

  const seen = new Set<string>();
  return results.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
}

export { SPORTS_CATALOG };
