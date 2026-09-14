/**
 * NBA team abbreviation -> official numeric team id, used to build a cdn.nba.com logo URL
 * (https://cdn.nba.com/logos/nba/{id}/global/L/logo.svg) instead of ESPN's badge, per request.
 * Team identity/schedule still comes from ESPN (ids used for scoreboard filtering) — this is
 * purely a display override, matched by abbreviation, with ESPN's own logo as a fallback if an
 * abbreviation isn't in this table.
 */
export const NBA_TEAM_IDS: Record<string, string> = {
  ATL: "1610612737",
  BOS: "1610612738",
  CLE: "1610612739",
  NOP: "1610612740",
  CHI: "1610612741",
  DAL: "1610612742",
  DEN: "1610612743",
  GS: "1610612744",
  GSW: "1610612744",
  HOU: "1610612745",
  LAC: "1610612746",
  LAL: "1610612747",
  MIA: "1610612748",
  MIL: "1610612749",
  MIN: "1610612750",
  BKN: "1610612751",
  NY: "1610612752",
  NYK: "1610612752",
  ORL: "1610612753",
  IND: "1610612754",
  PHI: "1610612755",
  PHX: "1610612756",
  POR: "1610612757",
  SAC: "1610612758",
  SA: "1610612759",
  SAS: "1610612759",
  OKC: "1610612760",
  TOR: "1610612761",
  UTAH: "1610612762",
  UTA: "1610612762",
  MEM: "1610612763",
  WSH: "1610612764",
  WAS: "1610612764",
  DET: "1610612765",
  CHA: "1610612766",
};

export function nbaLogoUrl(abbreviation?: string): string | null {
  if (!abbreviation) return null;
  const id = NBA_TEAM_IDS[abbreviation.toUpperCase()];
  return id ? `https://cdn.nba.com/logos/nba/${id}/global/L/logo.svg` : null;
}
