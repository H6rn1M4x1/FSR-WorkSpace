export const SPORTSDB_BASE = "https://www.thesportsdb.com/api/v1/json/3";

// Netlify Functions are short-lived, so this only helps within a single warm instance —
// harmless either way since it's just an optimization, not a correctness requirement.
let allLeaguesCache: any[] | null = null;
export async function getAllLeagues(): Promise<any[]> {
  if (allLeaguesCache) return allLeaguesCache;
  const r = await fetch(`${SPORTSDB_BASE}/all_leagues.php`);
  const data = await r.json();
  allLeaguesCache = data?.leagues || [];
  return allLeaguesCache;
}
