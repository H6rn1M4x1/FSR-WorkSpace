import type { Handler } from "@netlify/functions";
import { SPORTSDB_BASE } from "./_lib/sportsdb";

export const handler: Handler = async (event) => {
  try {
    const leagueId = event.queryStringParameters?.leagueId;
    if (!leagueId) return { statusCode: 400, body: JSON.stringify({ error: "Missing leagueId" }) };
    const r = await fetch(`${SPORTSDB_BASE}/lookup_all_teams.php?id=${encodeURIComponent(leagueId)}`);
    const data = await r.json();
    const teams = (data?.teams || []).map((t: any) => ({
      id: t.idTeam,
      name: t.strTeam,
      badgeUrl: t.strTeamBadge || t.strTeamLogo || null,
    }));
    return { statusCode: 200, body: JSON.stringify({ teams }) };
  } catch (error: any) {
    console.error("Error in sportsdb-teams:", error);
    return { statusCode: 200, body: JSON.stringify({ teams: [], error: error?.message }) };
  }
};
