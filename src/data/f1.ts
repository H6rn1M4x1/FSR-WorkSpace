/**
 * 2026 F1 grid (11 teams — Audi replaces the Sauber entry, Cadillac joins as the new 11th
 * team). `id` doubles as the exact slug F1.com uses in its Cloudinary logo paths
 * (.../common/f1/2026/<id>/2026<id>logowhite.webp), given directly by the user, so the logo
 * URL is just a plain lookup — no scraping/matching needed for it anymore.
 * Driver photos still come from a Netlify scrape of formula1.com/en/drivers (see
 * eventsService.ts), matched by name, Wikipedia as a fallback.
 */
export interface F1Team {
  id: string;
  name: string;
  wikiTitle: string;
}

export interface F1Driver {
  id: string;
  name: string;
  teamId: string;
  wikiTitle: string;
}

export const F1_TEAMS: F1Team[] = [
  { id: "ferrari", name: "Ferrari", wikiTitle: "Scuderia Ferrari" },
  { id: "mercedes", name: "Mercedes", wikiTitle: "Mercedes-Benz in Formula One" },
  { id: "mclaren", name: "McLaren", wikiTitle: "McLaren" },
  { id: "redbullracing", name: "Red Bull Racing", wikiTitle: "Red Bull Racing" },
  { id: "racingbulls", name: "Racing Bulls", wikiTitle: "RB Formula One Team" },
  { id: "alpine", name: "Alpine", wikiTitle: "Alpine F1 Team" },
  { id: "haasf1team", name: "Haas", wikiTitle: "Haas F1 Team" },
  { id: "audi", name: "Audi", wikiTitle: "Audi F1" },
  { id: "williams", name: "Williams", wikiTitle: "Williams Grand Prix Engineering" },
  { id: "astonmartin", name: "Aston Martin", wikiTitle: "Aston Martin F1 Team" },
  { id: "cadillac", name: "Cadillac", wikiTitle: "Cadillac F1" },
];

export const F1_TEAM_LOGOS: Record<string, string> = {
  ferrari: "https://media.formula1.com/image/upload/c_lfill,w_48/q_auto/v1740000001/common/f1/2026/ferrari/2026ferrarilogowhite.webp",
  mercedes: "https://media.formula1.com/image/upload/c_lfill,w_48/q_auto/v1740000001/common/f1/2026/mercedes/2026mercedeslogowhite.webp",
  mclaren: "https://media.formula1.com/image/upload/c_lfill,w_48/q_auto/v1740000001/common/f1/2026/mclaren/2026mclarenlogowhite.webp",
  redbullracing: "https://media.formula1.com/image/upload/c_lfill,w_48/q_auto/v1740000001/common/f1/2026/redbullracing/2026redbullracinglogowhite.webp",
  racingbulls: "https://media.formula1.com/image/upload/c_lfill,w_48/q_auto/v1740000001/common/f1/2026/racingbulls/2026racingbullslogowhite.webp",
  alpine: "https://media.formula1.com/image/upload/c_lfill,w_48/q_auto/v1740000001/common/f1/2026/alpine/2026alpinelogowhite.webp",
  haasf1team: "https://media.formula1.com/image/upload/c_lfill,w_48/q_auto/v1740000001/common/f1/2026/haasf1team/2026haasf1teamlogowhite.webp",
  audi: "https://media.formula1.com/image/upload/c_lfill,w_48/q_auto/v1740000001/common/f1/2026/audi/2026audilogowhite.webp",
  williams: "https://media.formula1.com/image/upload/c_lfill,w_48/q_auto/v1740000001/common/f1/2026/williams/2026williamslogowhite.webp",
  astonmartin: "https://media.formula1.com/image/upload/c_lfill,w_48/q_auto/v1740000001/common/f1/2026/astonmartin/2026astonmartinlogowhite.webp",
  cadillac: "https://media.formula1.com/image/upload/c_lfill,w_48/q_auto/v1740000001/common/f1/2026/cadillac/2026cadillaclogowhite.webp",
};

export const F1_DRIVERS: F1Driver[] = [
  { id: "leclerc", name: "Charles Leclerc", teamId: "ferrari", wikiTitle: "Charles Leclerc" },
  { id: "hamilton", name: "Lewis Hamilton", teamId: "ferrari", wikiTitle: "Lewis Hamilton" },
  { id: "russell", name: "George Russell", teamId: "mercedes", wikiTitle: "George Russell (racing driver)" },
  { id: "antonelli", name: "Kimi Antonelli", teamId: "mercedes", wikiTitle: "Andrea Kimi Antonelli" },
  { id: "norris", name: "Lando Norris", teamId: "mclaren", wikiTitle: "Lando Norris" },
  { id: "piastri", name: "Oscar Piastri", teamId: "mclaren", wikiTitle: "Oscar Piastri" },
  { id: "verstappen", name: "Max Verstappen", teamId: "redbullracing", wikiTitle: "Max Verstappen" },
  { id: "hadjar", name: "Isack Hadjar", teamId: "racingbulls", wikiTitle: "Isack Hadjar" },
  { id: "lawson", name: "Liam Lawson", teamId: "racingbulls", wikiTitle: "Liam Lawson" },
  { id: "gasly", name: "Pierre Gasly", teamId: "alpine", wikiTitle: "Pierre Gasly" },
  { id: "colapinto", name: "Franco Colapinto", teamId: "alpine", wikiTitle: "Franco Colapinto" },
  { id: "ocon", name: "Esteban Ocon", teamId: "haasf1team", wikiTitle: "Esteban Ocon" },
  { id: "bearman", name: "Oliver Bearman", teamId: "haasf1team", wikiTitle: "Oliver Bearman" },
  { id: "hulkenberg", name: "Nico Hülkenberg", teamId: "audi", wikiTitle: "Nico Hülkenberg" },
  { id: "bortoleto", name: "Gabriel Bortoleto", teamId: "audi", wikiTitle: "Gabriel Bortoleto" },
  { id: "albon", name: "Alexander Albon", teamId: "williams", wikiTitle: "Alexander Albon" },
  { id: "sainz", name: "Carlos Sainz Jr.", teamId: "williams", wikiTitle: "Carlos Sainz Jr." },
  { id: "alonso", name: "Fernando Alonso", teamId: "astonmartin", wikiTitle: "Fernando Alonso" },
  { id: "stroll", name: "Lance Stroll", teamId: "astonmartin", wikiTitle: "Lance Stroll" },
  { id: "perez", name: "Sergio Pérez", teamId: "cadillac", wikiTitle: "Sergio Pérez" },
  { id: "bottas", name: "Valtteri Bottas", teamId: "cadillac", wikiTitle: "Valtteri Bottas" },
];
