import type { Handler } from "@netlify/functions";
import { SPORTSDB_BASE } from "./_lib/sportsdb";

export const handler: Handler = async (event) => {
  try {
    const leagueId = event.queryStringParameters?.leagueId;
    const teamId = event.queryStringParameters?.teamId;
    const url = teamId
      ? `${SPORTSDB_BASE}/eventsnext.php?id=${encodeURIComponent(teamId)}`
      : leagueId
      ? `${SPORTSDB_BASE}/eventsnextleague.php?id=${encodeURIComponent(leagueId)}`
      : null;
    if (!url) return { statusCode: 400, body: JSON.stringify({ error: "Missing leagueId or teamId" }) };

    const r = await fetch(url);
    const data = await r.json();
    const events = (data?.events || []).map((e: any) => ({
      id: e.idEvent,
      title: e.strEvent,
      leagueName: e.strLeague,
      date: e.dateEvent,
      time: e.strTime ? e.strTime.slice(0, 5) : null,
      homeTeamBadge: e.strHomeTeamBadge || null,
      awayTeamBadge: e.strAwayTeamBadge || null,
      venue: e.strVenue || null,
    }));
    return { statusCode: 200, body: JSON.stringify({ events }) };
  } catch (error: any) {
    console.error("Error in sportsdb-next-events:", error);
    return { statusCode: 200, body: JSON.stringify({ events: [], error: error?.message }) };
  }
};
