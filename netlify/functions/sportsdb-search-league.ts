import type { Handler } from "@netlify/functions";
import { getAllLeagues } from "./_lib/sportsdb";

export const handler: Handler = async (event) => {
  try {
    const query = (event.queryStringParameters?.q || "").toLowerCase();
    const sport = (event.queryStringParameters?.sport || "").toLowerCase();
    const country = (event.queryStringParameters?.country || "").toLowerCase();
    if (!sport) return { statusCode: 400, body: JSON.stringify({ error: "Missing sport" }) };

    const leagues = await getAllLeagues();
    const bySport = leagues.filter((l: any) => (l.strSport || "").toLowerCase() === sport);

    let match: any = null;
    if (country) {
      match = bySport.find((l: any) => (l.strLeague || "").toLowerCase().includes(country));
    }
    if (!match && query) {
      match = bySport.find((l: any) => (l.strLeague || "").toLowerCase().includes(query));
    }
    if (!match) match = bySport[0] || null;

    if (!match) return { statusCode: 200, body: JSON.stringify({ leagueId: null }) };
    return { statusCode: 200, body: JSON.stringify({ leagueId: match.idLeague, leagueName: match.strLeague }) };
  } catch (error: any) {
    console.error("Error in sportsdb-search-league:", error);
    return { statusCode: 200, body: JSON.stringify({ leagueId: null, error: error?.message }) };
  }
};
