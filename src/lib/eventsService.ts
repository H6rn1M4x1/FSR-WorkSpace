import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  saveItemToFirestore,
  refetchCategory,
  subscribeToCategory,
} from "./firestoreSyncService";
import type { EventPreferences, SanJuanEvent, SportEvent } from "../types";
import { SPORTS_CATALOG, getSportById } from "./sportsCatalog";

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
  const leagueId = await resolveLeagueId(sportId);
  if (!leagueId) return [];
  const res = await fetch(`/.netlify/functions/sportsdb-teams?leagueId=${encodeURIComponent(leagueId)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.teams || [];
}

/** Upcoming events for every sport/team the user follows, deduplicated. */
export async function fetchFollowedSportEvents(prefs: EventPreferences | null): Promise<SportEvent[]> {
  if (!prefs || prefs.followedSports.length === 0) return [];
  const results: SportEvent[] = [];

  for (const sportId of prefs.followedSports) {
    const teams = prefs.followedTeams[sportId] || [];
    try {
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
